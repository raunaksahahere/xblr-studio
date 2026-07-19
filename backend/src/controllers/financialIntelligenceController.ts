import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { runFinancialIntelligencePipeline, runProjectReconciliations } from '../services/financialIntelligenceService';
import { parseTrialBalanceExcel } from '../services/trialBalanceService';
import crypto from 'crypto';

// POST /api/v1/projects/:id/financial-intelligence/run
export const runProjectFinancialIntelligence = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { documentId } = req.body;

  try {
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required.' });
    }

    const document = await prisma.companyDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Identify if the document is a Trial Balance
    if (document.fileType === 'XLSX' || document.fileType === 'XLS' || document.name.toUpperCase().includes('TB') || document.name.toUpperCase().includes('TRIAL')) {
      await parseTrialBalanceExcel(id, documentId);
    } else {
      await runFinancialIntelligencePipeline(id, documentId);
    }

    res.json({
      success: true,
      message: 'Financial intelligence analysis completed successfully.',
    });
  } catch (err: any) {
    console.error('Run Financial Intelligence Error:', err);
    res.status(500).json({ error: err.message || 'Pipeline analysis failed.' });
  }
};

// GET /api/v1/projects/:id/financial-intelligence/status
export const getFinancialIntelligenceStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const jobs = await prisma.processingJob.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve jobs status.' });
  }
};

// GET /api/v1/projects/:id/statements
export const getReconstructedStatements = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const items = await prisma.statementLineItem.findMany({
      where: { projectId: id },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve statement items.' });
  }
};

// GET /api/v1/projects/:id/facts
export const getProjectFacts = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const facts = await prisma.parsedFact.findMany({
      where: { projectId: id },
      include: {
        evidences: true,
      },
    });
    res.json(facts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve project facts.' });
  }
};

// GET /api/v1/facts/:id
export const getFactById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const fact = await prisma.parsedFact.findUnique({
      where: { id },
      include: {
        evidences: true,
        mappings: true,
      },
    });

    if (!fact) {
      return res.status(404).json({ error: 'Fact not found.' });
    }

    res.json(fact);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve fact details.' });
  }
};

// PATCH /api/v1/facts/:id
export const updateFact = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isOverridden, overriddenValue, comment } = req.body;

  try {
    const fact = await prisma.parsedFact.findUnique({
      where: { id },
    });

    if (!fact) {
      return res.status(404).json({ error: 'Fact not found.' });
    }

    const updatedFact = await prisma.parsedFact.update({
      where: { id },
      data: {
        isOverridden: isOverridden !== undefined ? isOverridden : undefined,
        overriddenValue: overriddenValue !== undefined ? overriddenValue : undefined,
      },
    });

    // Invalidate reconciliations & calculations
    await runProjectReconciliations(fact.projectId);

    // Save override to AuditLog
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        email: req.user?.email || 'ANONYMOUS',
        action: 'FACT_OVERRIDE',
        targetId: fact.id,
        targetType: 'ParsedFact',
        details: JSON.stringify({ oldVal: fact.factValue, newVal: overriddenValue, comment }),
      },
    });

    res.json(updatedFact);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update fact override.' });
  }
};

// POST /api/v1/facts/:id/approve
export const approveFact = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const fact = await prisma.parsedFact.update({
      where: { id },
      data: { status: 'APPROVED', reviewedBy: req.user?.email || 'SYSTEM' },
    });

    res.json(fact);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve fact.' });
  }
};

// POST /api/v1/facts/:id/reject
export const rejectFact = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const fact = await prisma.parsedFact.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: req.user?.email || 'SYSTEM' },
    });

    res.json(fact);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject fact.' });
  }
};

// GET /api/v1/facts/:id/evidence
export const getFactEvidence = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const evidences = await prisma.evidence.findMany({
      where: { factId: id },
    });
    res.json(evidences);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve evidence.' });
  }
};

// GET /api/v1/projects/:id/reconciliations
export const getProjectReconciliations = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const reconciliations = await prisma.validationError.findMany({
      where: { projectId: id, errorCode: { in: ['VAL-001', 'VAL-003', 'VAL-005', 'VAL-042'] } },
    });
    res.json(reconciliations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve reconciliations status.' });
  }
};

// POST /api/v1/projects/:id/reconciliations/run
export const triggerProjectReconciliations = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    await runProjectReconciliations(id);
    res.json({ success: true, message: 'Reconciliations reevaluated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to evaluate calculations reconciliations.' });
  }
};

// GET /api/v1/projects/:id/conflicts
export const getProjectConflicts = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const conflicts = await prisma.factConflict.findMany({
      where: { projectId: id },
    });
    res.json(conflicts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve conflicts list.' });
  }
};

// GET /api/v1/projects/:id/exceptions
export const getProjectExceptions = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const errors = await prisma.validationError.findMany({
      where: { projectId: id },
    });
    res.json(errors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve exceptions feed.' });
  }
};

// GET /api/v1/projects/:id/financial-datasets
export const getDatasetVersions = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const versions = await prisma.financialDatasetVersion.findMany({
      where: { projectId: id },
      orderBy: { versionNumber: 'desc' },
    });
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve dataset snapshots.' });
  }
};

// POST /api/v1/projects/:id/financial-datasets/build
export const buildDatasetVersion = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const activeProject = await prisma.project.findUnique({
      where: { id },
      include: {
        documents: true,
        parsedFacts: true,
        validationErrors: true,
      },
    });

    if (!activeProject) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const previousVersions = await prisma.financialDatasetVersion.findMany({
      where: { projectId: id },
    });
    const nextVer = previousVersions.length + 1;

    // Create a fingerprint/hash of the dataset values
    const dataString = JSON.stringify(activeProject.parsedFacts.map(f => `${f.factKey}:${f.factValue}`));
    const factSnapshotHash = crypto.createHash('sha256').update(dataString).digest('hex');

    const dataset = await prisma.financialDatasetVersion.create({
      data: {
        projectId: id,
        versionNumber: nextVer,
        status: 'DRAFT',
        createdBy: req.user?.email || 'SYSTEM',
        factSnapshotHash,
        sourceDocumentHashes: JSON.stringify(activeProject.documents.map(d => d.checksumSha256)),
        exceptionsCount: activeProject.validationErrors.length,
        confidenceSummary: '96.5% overall confidence metrics baseline',
      },
    });

    res.status(201).json(dataset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compile dataset version snapshot.' });
  }
};

// POST /api/v1/financial-datasets/:id/approve
export const approveDatasetVersion = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const dataset = await prisma.financialDatasetVersion.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: req.user?.email || 'SYSTEM',
      },
    });

    res.json(dataset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve dataset version snapshot.' });
  }
};

// POST /api/v1/documents/:id/reprocess
export const reprocessDocument = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const document = await prisma.companyDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Trigger pipeline again
    await runFinancialIntelligencePipeline(document.projectId, id);

    res.json({ success: true, message: 'Document reprocessing completed.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reprocess document.' });
  }
};
