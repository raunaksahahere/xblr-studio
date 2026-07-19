import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import prisma from '../config/db';

export const tenantAccessControl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user session found.' });
    }

    const { organizationId } = req.user;

    // Extract potential parameters from headers/body/query
    const projectId = req.params.projectId || req.query.projectId || req.body.projectId;
    const companyId = req.params.companyId || req.query.companyId || req.body.companyId;
    const cin = req.params.cin || req.query.cin || req.body.cin;
    const documentId = req.params.documentId || req.query.documentId || req.body.documentId;
    const factId = req.params.factId || req.query.factId || req.body.factId;
    const runId = req.params.runId || req.query.runId || req.body.runId;
    const errorId = req.params.errorId || req.query.errorId || req.body.errorId;
    const conflictId = req.params.conflictId || req.query.conflictId || req.body.conflictId;

    // Manual segment parser to bypass Express's late req.params population
    const segments = req.originalUrl.split('?')[0].split('/');
    
    let resolvedProjectId = projectId;
    let resolvedCompanyId = companyId;
    let resolvedDocumentId = documentId;
    let resolvedFactId = factId;
    let resolvedRunId = runId;
    let resolvedErrorId = errorId;
    let resolvedConflictId = conflictId;
    let resolvedCin = cin;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];

      if (nextSegment && nextSegment.length > 0) {
        if (segment === 'projects') {
          resolvedProjectId = nextSegment;
        } else if (segment === 'companies') {
          if (nextSegment.length === 21) {
            resolvedCin = nextSegment;
          } else {
            resolvedCompanyId = nextSegment;
          }
        } else if (segment === 'documents') {
          resolvedDocumentId = nextSegment;
        } else if (segment === 'facts' || segment === 'reviews') {
          resolvedFactId = nextSegment;
        } else if (segment === 'validation-runs') {
          resolvedRunId = nextSegment;
        } else if (segment === 'validations') {
          resolvedErrorId = nextSegment;
        } else if (segment === 'conflicts') {
          resolvedConflictId = nextSegment;
        }
      }
    }

    // 1. Validate Project Scope
    if (resolvedProjectId && resolvedProjectId !== 'project') {
      const project = await prisma.project.findFirst({
        where: { id: resolvedProjectId, organizationId }
      });
      if (!project) {
        return res.status(403).json({ error: 'Access Denied: Project not found in organization context.' });
      }
    }

    // 2. Validate Company Scope
    if (resolvedCompanyId && resolvedCompanyId !== 'companies') {
      const company = await prisma.company.findFirst({
        where: { id: resolvedCompanyId, organizationId }
      });
      if (!company) {
        return res.status(403).json({ error: 'Access Denied: Company not found in organization context.' });
      }
    }

    // 3. Validate CIN Scope
    if (resolvedCin) {
      const company = await prisma.company.findFirst({
        where: { cin: resolvedCin, organizationId }
      });
      if (!company) {
        return res.status(403).json({ error: 'Access Denied: Company CIN not found in organization context.' });
      }
    }

    // 4. Validate Document Scope
    if (resolvedDocumentId && resolvedDocumentId !== 'documents') {
      const doc = await prisma.companyDocument.findFirst({
        where: { id: resolvedDocumentId },
        include: { project: true }
      });
      if (!doc || doc.project.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access Denied: Document ownership mismatch.' });
      }
    }

    // 5. Validate Fact Scope
    if (resolvedFactId && resolvedFactId !== 'facts') {
      const fact = await prisma.parsedFact.findFirst({
        where: { id: resolvedFactId },
        include: { project: true }
      });
      if (!fact || fact.project.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access Denied: Fact ownership mismatch.' });
      }
    }

    // 6. Validate ValidationRun Scope
    if (resolvedRunId && resolvedRunId !== 'validation-runs') {
      const run = await prisma.validationRun.findFirst({
        where: { id: resolvedRunId },
        include: { project: true }
      });
      if (!run || run.project.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access Denied: Validation run ownership mismatch.' });
      }
    }

    // 7. Validate ValidationError Scope
    if (resolvedErrorId && resolvedErrorId !== 'validations') {
      const err = await prisma.validationError.findFirst({
        where: { id: resolvedErrorId },
        include: { project: true }
      });
      if (!err || err.project.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access Denied: Validation error ownership mismatch.' });
      }
    }

    // 8. Validate Memory Conflict Scope
    if (resolvedConflictId && resolvedConflictId !== 'conflicts') {
      const conflict = await prisma.memoryConflict.findUnique({
        where: { id: resolvedConflictId }
      });
      if (!conflict) {
        return res.status(403).json({ error: 'Access Denied: Memory conflict not found.' });
      }
      const company = await prisma.company.findFirst({
        where: { cin: conflict.companyCin, organizationId }
      });
      if (!company) {
        return res.status(403).json({ error: 'Access Denied: Conflict company ownership mismatch.' });
      }
    }

    next();
  } catch (error) {
    console.error('[TenantIsolation] Scope validation error:', error);
    res.status(500).json({ error: 'Internal security isolation checks failed.' });
  }
};
