import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { chatWithCopilot } from '../services/copilotService';
import { getCompanyMemory, createOrUpdateMemory, getMemoryConflicts, resolveConflict } from '../services/memoryService';
import { getGraphNeighborhood, traceFactLineage } from '../services/knowledgeGraphService';
import { runReconciliation, getReconciliationRuns } from '../services/reconciliationService';

// POST /api/copilot/chat
export const handleCopilotChat = async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, message, content, mode } = req.body;
  try {
    const reply = await chatWithCopilot(projectId, message || content || 'Status check', mode || 'ASK');
    res.json(reply);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/companies/:id/memory
export const handleGetCompanyMemory = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const memory = await getCompanyMemory(company.cin);
    res.json(memory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/companies/:id/memory
export const handleUpdateCompanyMemory = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { category, keyName, dataValue, financialYear } = req.body;
  const userId = req.user?.id || 'SYSTEM';
  try {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const record = await createOrUpdateMemory(company.cin, category, keyName, dataValue, financialYear, userId);
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/companies/:id/memory/conflicts
export const handleGetMemoryConflicts = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const conflicts = await getMemoryConflicts(company.cin);
    res.json(conflicts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/memory/conflicts/:conflictId/resolve
export const handleResolveConflict = async (req: AuthenticatedRequest, res: Response) => {
  const { conflictId } = req.params;
  const { resolution } = req.body; // 'UPDATE_MEMORY' | 'KEEP_MEMORY'
  const userId = req.user?.id || 'SYSTEM';
  try {
    const result = await resolveConflict(conflictId, resolution, userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/graph/neighborhood?companyId=:companyId
export const handleGetGraphNeighborhood = async (req: AuthenticatedRequest, res: Response) => {
  const { companyId } = req.query;
  try {
    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'companyId query param required' });
    }
    const graph = await getGraphNeighborhood(companyId);
    res.json(graph);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/graph/path?factId=:factId
export const handleTraceFactLineage = async (req: AuthenticatedRequest, res: Response) => {
  const { factId } = req.query;
  try {
    if (!factId || typeof factId !== 'string') {
      return res.status(400).json({ error: 'factId query param required' });
    }
    const path = await traceFactLineage(factId);
    res.json(path);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/projects/:id/reconcile
export const handleRunReconciliation = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const run = await runReconciliation(id);
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/projects/:id/reconciliations
export const handleGetReconciliations = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const runs = await getReconciliationRuns(id);
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Legacy/Compatibility Copilot exports
export const getConversations = async (req: AuthenticatedRequest, res: Response) => {
  res.json([
    { id: 'default-conv', projectId: 'active-project' }
  ]);
};

export const getConversationMessages = async (req: AuthenticatedRequest, res: Response) => {
  res.json([
    { id: '1', role: 'SYSTEM', content: 'Reviewer Copilot activated.' }
  ]);
};

export const postChatMessage = async (req: AuthenticatedRequest, res: Response) => {
  const { content, projectId } = req.body;
  try {
    const reply = await chatWithCopilot(projectId || 'active-project', content, 'ASK');
    res.json({
      conversationId: 'default-conv',
      message: {
        id: Math.random().toString(),
        role: 'ASSISTANT',
        content: `**Conclusion**: ${reply.conclusion}\n**Evidence**: ${reply.evidence}\n**Reasoning**: ${reply.reasoning}`
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

