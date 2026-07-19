import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { generateXbrlInstance } from '../services/xbrlGeneratorService';
import { generatePdfFilingReport } from '../services/pdfGeneratorService';
import { buildFilingPackage } from '../services/packageBuilderService';
import { getProjectReadinessGate } from '../services/validationEngine';
import { getProjectPipelineStages } from '../services/pipelineService';

// GET /api/projects/:id/generation-readiness
export const getGenerationReadiness = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const gate = await getProjectReadinessGate(id);
    res.json(gate);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/projects/:id/xbrl/draft
export const generateDraftXbrl = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const email = req.user?.email || 'ANONYMOUS';
  try {
    const instance = await generateXbrlInstance(id, email, true);
    res.status(201).json(instance);
  } catch (err: any) {
    res.status(550).json({ error: err.message });
  }
};

// POST /api/projects/:id/xbrl/final
export const generateFinalXbrl = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const email = req.user?.email || 'ANONYMOUS';
  try {
    const instance = await generateXbrlInstance(id, email, false);
    res.status(201).json(instance);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/projects/:id/xbrl/versions
export const getXbrlVersions = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const versions = await prisma.xbrlInstance.findMany({
      where: { projectId: id },
      orderBy: { versionNumber: 'desc' },
    });
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve versioned instances.' });
  }
};

// GET /api/xbrl/:versionId/facts
export const getXbrlInstanceFacts = async (req: AuthenticatedRequest, res: Response) => {
  const { versionId } = req.params;
  try {
    const facts = await prisma.xbrlFact.findMany({
      where: { xbrlInstanceId: versionId },
    });
    res.json(facts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve instance facts.' });
  }
};

// POST /api/projects/:id/pdf/preview
export const previewPdfReport = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const email = req.user?.email || 'ANONYMOUS';
  try {
    const report = await generatePdfFilingReport(id, email, true);
    res.status(201).json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/projects/:id/pdf/final
export const generateFinalPdf = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const email = req.user?.email || 'ANONYMOUS';
  try {
    const report = await generatePdfFilingReport(id, email, false);
    res.status(201).json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/projects/:id/pdf/versions
export const getPdfVersions = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const versions = await prisma.generatedArtifact.findMany({
      where: { projectId: id, type: 'PDF' },
      orderBy: { versionNumber: 'desc' }
    });
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve PDF versions.' });
  }
};

// POST /api/projects/:id/packages
export const compileFilingPackage = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const email = req.user?.email || 'ANONYMOUS';
  try {
    const zipPack = await buildFilingPackage(id, email);
    res.status(201).json(zipPack);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/projects/:id/packages
export const getFilingPackages = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const packages = await prisma.generatedArtifact.findMany({
      where: { projectId: id, type: 'ZIP' },
      orderBy: { versionNumber: 'desc' }
    });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve packages.' });
  }
};

// GET /api/projects/:id/pipeline
export const getPipelineProgress = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const stages = await getProjectPipelineStages(id);
    res.json(stages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
