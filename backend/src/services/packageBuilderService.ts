import prisma from '../config/db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { updateStageProgress } from './pipelineService';

export const buildFilingPackage = async (projectId: string, createdBy: string) => {
  console.log(`[PackageBuilder] Compiling final submission package for project: ${projectId}`);
  await updateStageProgress(projectId, 'PackageBuilding', 20, 'RUNNING');

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { company: true },
  });

  if (!project) {
    throw new Error('Filing Project not found.');
  }

  // Retrieve latest XML and PDF artifacts
  const xmlArtifact = await prisma.generatedArtifact.findFirst({
    where: { projectId, type: 'XML' },
    orderBy: { versionNumber: 'desc' }
  });

  const pdfArtifact = await prisma.generatedArtifact.findFirst({
    where: { projectId, type: 'PDF' },
    orderBy: { versionNumber: 'desc' }
  });

  if (!xmlArtifact || !pdfArtifact) {
    throw new Error('Package Building failed: Final generated XML and PDF artifacts must exist.');
  }

  await updateStageProgress(projectId, 'PackageBuilding', 65, 'RUNNING');

  // 1. Generate package manifest index
  const manifest = {
    companyName: project.company.name,
    cin: project.company.cin,
    financialYear: project.financialYear,
    generatedAt: new Date().toISOString(),
    generatedBy: createdBy,
    components: [
      { type: 'XBRL_XML', filename: xmlArtifact.filename, sha256: xmlArtifact.sha256 },
      { type: 'HUMAN_PDF', filename: pdfArtifact.filename, sha256: pdfArtifact.sha256 }
    ]
  };

  const packageString = JSON.stringify(manifest, null, 2);

  // 2. Write simulated ZIP container file (holds the manifest JSON payload index)
  const dirPath = path.join(__dirname, '../../uploads/packages');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const cleanFilename = `${project.company.cin}_FY2024-25_FILING_PACKAGE.zip`;
  const storagePath = path.join(dirPath, cleanFilename);
  fs.writeFileSync(storagePath, packageString, 'utf8');

  const sha256 = crypto.createHash('sha256').update(packageString).digest('hex');

  const previousPacks = await prisma.generatedArtifact.findMany({
    where: { projectId, type: 'ZIP' }
  });
  const versionNumber = previousPacks.length + 1;

  const packageArtifact = await prisma.generatedArtifact.create({
    data: {
      projectId,
      type: 'ZIP',
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
        action: 'PACKAGE_BUILT',
        targetId: packageArtifact.id,
        targetType: 'GeneratedArtifact',
        details: JSON.stringify({ filename: cleanFilename, sha256 }),
      },
    });
  }

  await updateStageProgress(projectId, 'PackageBuilding', 100, 'COMPLETED');

  return packageArtifact;
};
