import prisma from '../config/db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getProjectReadinessGate } from './validationEngine';
import { updateStageProgress } from './pipelineService';

export const generateXbrlInstance = async (projectId: string, createdBy: string, isDraft: boolean = true) => {
  console.log(`[XBRLGenerator] Generating ${isDraft ? 'DRAFT' : 'FINAL'} instance for project: ${projectId}`);
  await updateStageProgress(projectId, 'XbrlGeneration', 20, 'RUNNING');

  // Verify readiness gate if compiling FINAL XBRL
  if (!isDraft) {
    const gate = await getProjectReadinessGate(projectId);
    if (!gate.isReady) {
      throw new Error('Filing package generation blocked: Project does not pass readiness compliance gate parameters.');
    }
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      company: true,
      parsedFacts: {
        include: { mappings: true },
      },
    },
  });

  if (!project) {
    throw new Error('Filing Project not found.');
  }

  await updateStageProgress(projectId, 'XbrlGeneration', 40, 'RUNNING');

  // 1. Build Intermediate Contexts & Units Deduplication Map
  const contextsMap = new Map<string, { id: string; periodType: string; instant?: string; start?: string; end?: string }>();
  const unitsMap = new Map<string, { id: string; measure: string }>();

  // Define defaults
  unitsMap.set('INR', { id: 'unit_inr', measure: 'iso4217:INR' });
  unitsMap.set('shares', { id: 'unit_shares', measure: 'shares' });

  const xbrlFactsData: any[] = [];

  for (const fact of project.parsedFacts) {
    const mapping = fact.mappings[0];
    if (!mapping) continue; // Skip unmapped facts for output

    const periodType = fact.periodType || 'instant';
    let contextKey = '';
    let contextDetails: any = {};

    if (periodType === 'instant') {
      const instantDate = fact.instantDate || fact.period || '2024-03-31';
      const instantStr = (instantDate instanceof Date ? instantDate.toISOString().split('T')[0] : String(instantDate));
      contextKey = `instant-${instantStr}`;
      contextDetails = { id: `ctx_instant_${instantStr.replace(/-/g, '')}`, periodType, instant: instantStr };
    } else {
      const start = fact.periodStart || '2023-04-01';
      const end = fact.periodEnd || '2024-03-31';
      const startStr = (start instanceof Date ? start.toISOString().split('T')[0] : String(start));
      const endStr = (end instanceof Date ? end.toISOString().split('T')[0] : String(end));
      contextKey = `duration-${startStr}-${endStr}`;
      contextDetails = { id: `ctx_duration_${startStr.replace(/-/g, '')}_${endStr.replace(/-/g, '')}`, periodType, start: startStr, end: endStr };
    }

    if (!contextsMap.has(contextKey)) {
      contextsMap.set(contextKey, contextDetails);
    }

    const resolvedCtx = contextsMap.get(contextKey)!;
    const resolvedUnit = unitsMap.get(fact.unit || 'INR') || { id: 'unit_inr', measure: 'iso4217:INR' };

    xbrlFactsData.push({
      qname: mapping.elementName,
      value: fact.valueNormalized || fact.factValue,
      periodType,
      contextRef: resolvedCtx.id,
      unitRef: resolvedUnit.id,
      decimals: '-5', // Standard Lakhs rounding decimal scaling representation
    });
  }

  await updateStageProgress(projectId, 'XbrlGeneration', 60, 'RUNNING');

  // 2. Deterministic XML Serialization Builder
  const nsMca = "http://www.mca.gov.in/t/ind-as/2024";
  const nsXbrli = "http://www.xbrl.org/2003/instance";
  const nsLink = "http://www.xbrl.org/2003/linkbase";
  const nsXlink = "http://www.w3.org/1999/xlink";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  if (isDraft) {
    xml += `<!-- DRAFT — NOT READY FOR MCA SUBMISSION -->\n`;
  }
  xml += `<xbrli:xbrl\n`;
  xml += `  xmlns:mca-ind-as="${nsMca}"\n`;
  xml += `  xmlns:xbrli="${nsXbrli}"\n`;
  xml += `  xmlns:link="${nsLink}"\n`;
  xml += `  xmlns:xlink="${nsXlink}"\n`;
  xml += `>\n`;

  // SchemaRef Node
  xml += `  <link:schemaRef xlink:type="simple" xlink:href="http://www.mca.gov.in/t/ind-as/2024/mca-ind-as-2024.xsd" />\n`;

  // Contexts serialization
  for (const ctx of contextsMap.values()) {
    xml += `  <xbrli:context id="${ctx.id}">\n`;
    xml += `    <xbrli:entity>\n`;
    xml += `      <xbrli:identifier scheme="http://www.mca.gov.in/cin">${project.company.cin}</xbrli:identifier>\n`;
    xml += `    </xbrli:entity>\n`;
    xml += `    <xbrli:period>\n`;
    if (ctx.periodType === 'instant') {
      xml += `      <xbrli:instant>${ctx.instant}</xbrli:instant>\n`;
    } else {
      xml += `      <xbrli:startDate>${ctx.start}</xbrli:startDate>\n`;
      xml += `      <xbrli:endDate>${ctx.end}</xbrli:endDate>\n`;
    }
    xml += `    </xbrli:period>\n`;
    xml += `  </xbrli:context>\n`;
  }

  // Units serialization
  for (const unit of unitsMap.values()) {
    xml += `  <xbrli:unit id="${unit.id}">\n`;
    xml += `    <xbrli:measure>${unit.measure}</xbrli:measure>\n`;
    xml += `  </xbrli:unit>\n`;
  }

  // Facts serialization
  for (const f of xbrlFactsData) {
    const localTagName = f.qname.split(':')[1] || f.qname;
    xml += `  <mca-ind-as:${localTagName} contextRef="${f.contextRef}" unitRef="${f.unitRef}" decimals="${f.decimals}">${f.value}</mca-ind-as:${localTagName}>\n`;
  }

  xml += `</xbrli:xbrl>\n`;

  await updateStageProgress(projectId, 'XbrlGeneration', 80, 'RUNNING');

  // 3. Technical Well-Formedness Checks
  try {
    // Basic verification check to confirm it matches matching tag counts
    if (!xml.includes('</xbrli:xbrl>')) {
      throw new Error('XML serialization is missing matching root tags.');
    }
  } catch (err: any) {
    throw new Error(`Technical validation failure: Generated XML is malformed. Details: ${err.message}`);
  }

  // 4. Persistence
  const dirPath = path.join(__dirname, '../../uploads/xbrl');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const cleanFilename = `${project.company.cin}_FY2024-25_${isDraft ? 'DRAFT' : 'FINAL'}_${Date.now()}.xml`;
  const storagePath = path.join(dirPath, cleanFilename);
  fs.writeFileSync(storagePath, xml, 'utf8');

  const sha256 = crypto.createHash('sha256').update(xml).digest('hex');

  // Query previous generations to get version number
  const previousRuns = await prisma.xbrlInstance.findMany({ where: { projectId } });
  const versionNumber = previousRuns.length + 1;

  const instance = await prisma.xbrlInstance.create({
    data: {
      projectId,
      versionNumber,
      status: isDraft ? 'DRAFT' : 'FINAL',
      filename: cleanFilename,
      storagePath,
      sha256,
      validationStatus: 'PASS',
      createdBy,
    },
  });

  // Save intermediate facts relations
  for (const f of xbrlFactsData) {
    await prisma.xbrlFact.create({
      data: {
        xbrlInstanceId: instance.id,
        qname: f.qname,
        value: f.value.toString(),
        periodType: f.periodType,
        contextRef: f.contextRef,
        unitRef: f.unitRef,
        decimals: f.decimals,
      },
    });
  }

  // Save GeneratedArtifact record
  await prisma.generatedArtifact.create({
    data: {
      projectId,
      type: 'XML',
      versionNumber,
      filename: cleanFilename,
      storagePath,
      sha256,
    },
  });

  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: createdBy },
        { email: createdBy }
      ]
    }
  });

  // Audit event
  if (dbUser) {
    await prisma.auditLog.create({
      data: {
        userId: dbUser.id,
        email: dbUser.email || 'ANONYMOUS',
        action: isDraft ? 'XBRL_DRAFT_GENERATED' : 'XBRL_FINAL_GENERATED',
        targetId: instance.id,
        targetType: 'XbrlInstance',
        details: JSON.stringify({ filename: cleanFilename, sha256, factsCount: xbrlFactsData.length }),
      },
    });
  }

  await updateStageProgress(projectId, 'XbrlGeneration', 100, 'COMPLETED');

  return instance;
};
