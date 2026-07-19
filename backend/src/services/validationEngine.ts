import prisma from '../config/db';
import crypto from 'crypto';

export interface ValidationSummary {
  critical: number;
  high: number;
  medium: number;
  warnings: number;
  passed: number;
}

// Run compliance orchestrator
export const runValidationRun = async (projectId: string, triggeredBy: string) => {
  console.log(`[ValidationEngine] Initiating compliance run for project: ${projectId}`);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      company: true,
      documents: true,
      parsedFacts: {
        include: { mappings: true },
      },
    },
  });

  if (!project) {
    throw new Error('Filing Project not found.');
  }

  // Retrieve current approved snapshots if available
  const latestFinancialDataset = await prisma.financialDatasetVersion.findFirst({
    where: { projectId },
    orderBy: { versionNumber: 'desc' },
  });

  const latestTaxonomyDataset = await prisma.taxonomyDataset.findFirst({
    where: { projectId },
    orderBy: { versionNumber: 'desc' },
  });

  // Create initial run record
  const run = await prisma.validationRun.create({
    data: {
      projectId,
      financialDatasetVersionId: latestFinancialDataset?.id || null,
      taxonomyDatasetVersionId: latestTaxonomyDataset?.id || null,
      status: 'RUNNING',
      triggeredBy,
    },
  });

  const results: any[] = [];

  // 1. Pre-flight Document Integrity Check
  for (const doc of project.documents) {
    if (doc.status === 'FAILED') {
      results.push({
        validationRunId: run.id,
        ruleCode: 'VAL-DOC-001',
        severity: 'HIGH',
        status: 'FAIL',
        title: 'Document Processing Failure',
        description: `Document "${doc.name}" failed pipeline extraction or OCR.`,
        expectedValue: 'PROCESSED',
        actualValue: doc.status,
      });
    }
  }

  // 2. Entity Identity Check (CIN & Name validations)
  const masterCIN = project.company.cin;
  const masterName = project.company.name;

  // Search facts for any extracted CIN / Name and verify
  const cinFacts = project.parsedFacts.filter(f => f.factKey.toLowerCase().includes('cin'));
  for (const fact of cinFacts) {
    if (fact.factValue !== masterCIN) {
      results.push({
        validationRunId: run.id,
        ruleCode: 'VAL-ENT-001',
        severity: 'CRITICAL',
        status: 'FAIL',
        title: 'CIN Identity Mismatch',
        description: `Extracted CIN "${fact.factValue}" does not match company master record CIN "${masterCIN}".`,
        expectedValue: masterCIN,
        actualValue: fact.factValue,
        affectedFactIds: fact.id,
      });
    }
  }

  // 3. Financial Mathematical Rules (Accounting Equation Checks)
  const assetsFact = project.parsedFacts.find(f => f.factKey === 'Assets');
  const equityFact = project.parsedFacts.find(f => f.factKey === 'Equity');
  const liabilitiesFact = project.parsedFacts.find(f => f.factKey === 'Liabilities');

  if (assetsFact && equityFact && liabilitiesFact) {
    const assetsVal = parseFloat(assetsFact.factValue) || 0;
    const equityVal = parseFloat(equityFact.factValue) || 0;
    const liabilitiesVal = parseFloat(liabilitiesFact.factValue) || 0;

    const sumLHS = assetsVal;
    const sumRHS = equityVal + liabilitiesVal;

    if (sumLHS !== sumRHS) {
      results.push({
        validationRunId: run.id,
        ruleCode: 'VAL-FIN-001',
        severity: 'CRITICAL',
        status: 'FAIL',
        title: 'Balance Sheet Mismatch',
        description: `Assets (${assetsVal}) must equal Equity + Liabilities (${sumRHS}).`,
        expectedValue: sumLHS.toString(),
        actualValue: sumRHS.toString(),
        difference: Math.abs(sumLHS - sumRHS).toString(),
        affectedFactIds: `${assetsFact.id},${equityFact.id},${liabilitiesFact.id}`,
      });
    } else {
      results.push({
        validationRunId: run.id,
        ruleCode: 'VAL-FIN-001',
        severity: 'CRITICAL',
        status: 'PASS',
        title: 'Balance Sheet Reconciled',
        description: `Assets (${assetsVal}) matches Equity + Liabilities (${sumRHS}) perfectly.`,
        expectedValue: sumLHS.toString(),
        actualValue: sumRHS.toString(),
      });
    }
  }

  // 4. Cross-Document Reconciliation Check
  // Compare Trial Balance vs Financial Statements values
  const trialBalanceFacts = project.parsedFacts.filter(f => f.section === 'TRIAL_BALANCE');
  const statementFacts = project.parsedFacts.filter(f => f.section !== 'TRIAL_BALANCE');

  for (const tbFact of trialBalanceFacts) {
    const matchingFSFact = statementFacts.find(f => f.factKey === tbFact.factKey);
    if (matchingFSFact && tbFact.factValue !== matchingFSFact.factValue) {
      results.push({
        validationRunId: run.id,
        ruleCode: 'VAL-REC-001',
        severity: 'MEDIUM',
        status: 'REVIEW_REQUIRED',
        title: `Reconciliation Variance: ${tbFact.factKey}`,
        description: `Trial Balance value (${tbFact.factValue}) differs from Financial Statement value (${matchingFSFact.factValue}).`,
        expectedValue: matchingFSFact.factValue,
        actualValue: tbFact.factValue,
        difference: (Math.abs(parseFloat(tbFact.factValue) - parseFloat(matchingFSFact.factValue))).toString(),
        affectedFactIds: `${tbFact.id},${matchingFSFact.id}`,
      });
    }
  }

  // 5. Taxonomy Dimensional Mappings checks
  for (const fact of project.parsedFacts) {
    const mapping = fact.mappings[0];
    if (mapping) {
      const concept = await prisma.taxonomyConcept.findUnique({
        where: { id: mapping.elementId },
      });

      if (concept) {
        // Block mappings to abstract elements
        if (concept.isAbstract) {
          results.push({
            validationRunId: run.id,
            ruleCode: 'VAL-TAX-001',
            severity: 'CRITICAL',
            status: 'FAIL',
            title: 'Abstract Concept Selected',
            description: `Abstract taxonomy element "${concept.qname}" mapped to fact "${fact.factKey}" cannot carry values.`,
            expectedValue: 'Concrete Concept',
            actualValue: concept.qname,
            affectedFactIds: fact.id,
          });
        }

        // Catch periodType mismatches
        const factPeriodType = fact.periodType || 'instant';
        if (concept.periodType !== factPeriodType) {
          results.push({
            validationRunId: run.id,
            ruleCode: 'VAL-TAX-002',
            severity: 'CRITICAL',
            status: 'FAIL',
            title: 'Period Type Mismatch',
            description: `Fact "${fact.factKey}" has periodType "${factPeriodType}" but mapped concept requires "${concept.periodType}".`,
            expectedValue: concept.periodType,
            actualValue: factPeriodType,
            affectedFactIds: fact.id,
          });
        }
      }
    }
  }

  // Persistent updates
  const summaryHash = crypto.createHash('sha256').update(JSON.stringify(results)).digest('hex');

  const criticalCount = results.filter(r => r.severity === 'CRITICAL' && r.status === 'FAIL').length;
  const highCount = results.filter(r => r.severity === 'HIGH' && r.status === 'FAIL').length;
  const warningCount = results.filter(r => r.status === 'WARNING' || r.status === 'REVIEW_REQUIRED').length;
  const passCount = results.filter(r => r.status === 'PASS').length;

  for (const item of results) {
    await prisma.validationResult.create({ data: item });
  }

  const updatedRun = await prisma.validationRun.update({
    where: { id: run.id },
    data: {
      status: 'SUCCEEDED',
      summaryHash,
      criticalCount,
      highCount,
      warningCount,
      passCount,
    },
    include: {
      results: true,
    },
  });

  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: triggeredBy },
        { email: triggeredBy }
      ]
    }
  });

  // Audit event
  if (dbUser) {
    await prisma.auditLog.create({
      data: {
        userId: dbUser.id,
        email: dbUser.email || 'ANONYMOUS',
        action: 'VALIDATION_STARTED',
        targetId: run.id,
        targetType: 'ValidationRun',
        details: JSON.stringify({ criticalCount, highCount, warningCount, passCount }),
      },
    });
  }

  return updatedRun;
};

// Calculate Project Readiness Gate status
export const getProjectReadinessGate = async (projectId: string) => {
  const latestFinancialDataset = await prisma.financialDatasetVersion.findFirst({
    where: { projectId },
    orderBy: { versionNumber: 'desc' },
  });

  const latestTaxonomyDataset = await prisma.taxonomyDataset.findFirst({
    where: { projectId },
  });

  const latestRun = await prisma.validationRun.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  const financialReviewStatus = latestFinancialDataset?.status === 'APPROVED' ? 'PASS' : 'PENDING';
  const taxonomyReviewStatus = latestTaxonomyDataset?.status === 'APPROVED' ? 'PASS' : 'PENDING';

  // Compliance is PASS only if validation run exists and contains zero critical/high errors
  let complianceStatus = 'PENDING';
  if (latestRun) {
    complianceStatus = (latestRun.criticalCount === 0 && latestRun.highCount === 0) ? 'PASS' : 'FAIL';
  }

  const isReady = financialReviewStatus === 'PASS' && taxonomyReviewStatus === 'PASS' && complianceStatus === 'PASS';

  return {
    projectId,
    stages: {
      documents: 'PASS', // Base uploads
      financialIntelligence: 'PASS',
      financialReview: financialReviewStatus,
      taxonomyMapping: 'PASS',
      taxonomyReview: taxonomyReviewStatus,
      validation: complianceStatus,
      finalReview: isReady ? 'PASS' : 'PENDING',
    },
    isReady,
  };
};
