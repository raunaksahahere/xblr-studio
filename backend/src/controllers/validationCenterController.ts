import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { runValidationRun, getProjectReadinessGate } from '../services/validationEngine';

// POST /api/v1/projects/:id/validation-runs
export const triggerValidation = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const email = req.user?.email || 'ANONYMOUS';
    const runResult = await runValidationRun(id, email);
    res.status(201).json(runResult);
  } catch (err: any) {
    console.error('[ValidationController] Trigger error:', err);
    res.status(500).json({ error: err.message || 'Failed to execute validation run.' });
  }
};

// GET /api/v1/projects/:id/validation-runs
export const getValidationRuns = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const runs = await prisma.validationRun.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve validation runs.' });
  }
};

// GET /api/v1/validation-runs/:id/results
export const getValidationRunResults = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const results = await prisma.validationResult.findMany({
      where: { validationRunId: id },
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve validation run results.' });
  }
};

// GET /api/v1/projects/:id/readiness
export const getReadinessGate = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const gate = await getProjectReadinessGate(id);
    res.json(gate);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch readiness status.' });
  }
};
