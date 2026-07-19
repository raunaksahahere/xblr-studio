import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { tenantAccessControl } from '../middleware/tenant';
import { registerUser, loginUser, refreshToken, getMe } from '../controllers/authController';
import { createCompany, getCompanies, getCompanyByCin, getCompanyHistory } from '../controllers/companyController';
import { createProject, getProjects, getProjectById, updateProjectStatus } from '../controllers/projectController';
import { uploadDocument, getDocumentsByProject, downloadDocument, upload } from '../controllers/documentController';
import { overrideFactValue, createReviewSnapshot, getReviewHistory } from '../controllers/reviewController';
import { getValidationErrors, clearValidationError } from '../controllers/validationController';
import { getAuditLogs } from '../controllers/auditController';
import {
  getNotifications,
  markNotificationRead,
  getApiKeys,
  createApiKey,
  getSubscriptionStatus,
  getKnowledgeGraph,
} from '../controllers/extraController';
import {
  getConversations,
  getConversationMessages,
  postChatMessage,
} from '../controllers/copilotController';
import {
  getAutomationRules,
  updateAutomationRule,
  triggerAutomationRule,
} from '../controllers/automationController';
import {
  runProjectFinancialIntelligence,
  getFinancialIntelligenceStatus,
  getReconstructedStatements,
  getProjectFacts,
  getFactById,
  updateFact,
  approveFact,
  rejectFact,
  getFactEvidence,
  getProjectReconciliations,
  triggerProjectReconciliations,
  getProjectConflicts,
  getProjectExceptions,
  getDatasetVersions,
  buildDatasetVersion,
  approveDatasetVersion,
  reprocessDocument,
} from '../controllers/financialIntelligenceController';
import {
  getTaxonomyReleases,
  importTaxonomy,
  getProjectTaxonomyMappings,
  updateFactTaxonomyMapping,
  buildTaxonomyDataset,
  approveTaxonomyDataset,
  getTaxonomyDatasets,
} from '../controllers/taxonomyMappingController';
import {
  triggerValidation,
  getValidationRuns,
  getValidationRunResults,
  getReadinessGate,
} from '../controllers/validationCenterController';

const router = Router();

// Public Authentication
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.post('/auth/refresh', refreshToken);

// Authenticated Routes
router.use(authenticateToken as any);
router.use(tenantAccessControl as any);

// User Profile
router.get('/auth/me', getMe as any);

// Company APIs
router.post('/companies', requirePermission('company:create') as any, createCompany as any);
router.get('/companies', getCompanies as any);
router.get('/companies/:cin', getCompanyByCin as any);
router.get('/companies/:id/history', getCompanyHistory as any);

// Project APIs
router.post('/projects', requirePermission('project:create') as any, createProject as any);
router.get('/projects', getProjects as any);
router.get('/projects/:id', getProjectById as any);
router.put('/projects/:id/status', requirePermission('project:edit') as any, updateProjectStatus as any);

// Document APIs
router.post('/documents', upload.single('file'), uploadDocument as any);
router.get('/documents/project/:projectId', getDocumentsByProject as any);
router.get('/documents/:id/download', downloadDocument as any);

// Review APIs
router.put('/reviews/:factId/override', requirePermission('review:override') as any, overrideFactValue as any);
router.post('/reviews/:projectId/snapshot', requirePermission('review:save') as any, createReviewSnapshot as any);
router.get('/reviews/:projectId/history', getReviewHistory as any);

// Validation APIs
router.get('/validations/:projectId', getValidationErrors as any);
router.put('/validations/:errorId/clear', requirePermission('validation:clear') as any, clearValidationError as any);

// Audit API
router.get('/audits', requirePermission('audit:view') as any, getAuditLogs as any);

// Notifications
router.get('/notifications', getNotifications as any);
router.put('/notifications/:id/read', markNotificationRead as any);

// API Keys & Subscription
router.get('/apikeys', getApiKeys as any);
router.post('/apikeys', requirePermission('api:write') as any, createApiKey as any);
router.get('/subscriptions/status', getSubscriptionStatus as any);

// Knowledge Graph
router.get('/knowledge/graph', getKnowledgeGraph as any);

// Copilot APIs
router.get('/copilot/conversations', getConversations as any);
router.get('/copilot/conversations/:conversationId/messages', getConversationMessages as any);
router.post('/copilot/chat', postChatMessage as any);

// Automation Center APIs
router.get('/automations', getAutomationRules as any);
router.put('/automations/:id', updateAutomationRule as any);
router.post('/automations/:id/trigger', triggerAutomationRule as any);

// Financial Intelligence Engine APIs
router.post('/projects/:id/financial-intelligence/run', runProjectFinancialIntelligence as any);
router.get('/projects/:id/financial-intelligence/status', getFinancialIntelligenceStatus as any);
router.get('/projects/:id/statements', getReconstructedStatements as any);
router.get('/projects/:id/facts', getProjectFacts as any);
router.get('/facts/:id', getFactById as any);
router.patch('/facts/:id', updateFact as any);
router.post('/facts/:id/approve', approveFact as any);
router.post('/facts/:id/reject', rejectFact as any);
router.get('/facts/:id/evidence', getFactEvidence as any);
router.get('/projects/:id/reconciliations', getProjectReconciliations as any);
router.post('/projects/:id/reconciliations/run', triggerProjectReconciliations as any);
router.get('/projects/:id/conflicts', getProjectConflicts as any);
router.get('/projects/:id/exceptions', getProjectExceptions as any);
router.get('/projects/:id/financial-datasets', getDatasetVersions as any);
router.post('/projects/:id/financial-datasets/build', buildDatasetVersion as any);
router.post('/financial-datasets/:id/approve', approveDatasetVersion as any);
router.post('/documents/:id/reprocess', reprocessDocument as any);

// Taxonomy Mapping Engine APIs
router.get('/taxonomies', getTaxonomyReleases as any);
router.post('/taxonomies/import', importTaxonomy as any);
router.get('/projects/:id/taxonomy-mappings', getProjectTaxonomyMappings as any);
router.patch('/taxonomy-mappings/:id', updateFactTaxonomyMapping as any);
router.post('/projects/:id/taxonomy-datasets/build', buildTaxonomyDataset as any);
router.post('/taxonomy-datasets/:id/approve', approveTaxonomyDataset as any);
router.get('/projects/:id/taxonomy-datasets', getTaxonomyDatasets as any);

// Validation Center & Compliance Engine
router.post('/projects/:id/validation-runs', triggerValidation as any);
router.get('/projects/:id/validation-runs', getValidationRuns as any);
router.get('/validation-runs/:id/results', getValidationRunResults as any);
router.get('/projects/:id/readiness', getReadinessGate as any);

import {
  getGenerationReadiness,
  generateDraftXbrl,
  generateFinalXbrl,
  getXbrlVersions,
  getXbrlInstanceFacts,
  previewPdfReport,
  generateFinalPdf,
  getPdfVersions,
  compileFilingPackage,
  getFilingPackages,
  getPipelineProgress
} from '../controllers/xbrlGenerationController';

// Phase 5 Output Engines APIs
router.get('/projects/:id/generation-readiness', getGenerationReadiness as any);
router.post('/projects/:id/xbrl/draft', generateDraftXbrl as any);
router.post('/projects/:id/xbrl/final', generateFinalXbrl as any);
router.get('/projects/:id/xbrl/versions', getXbrlVersions as any);
router.get('/xbrl/:versionId/facts', getXbrlInstanceFacts as any);
router.post('/projects/:id/pdf/preview', previewPdfReport as any);
router.post('/projects/:id/pdf/final', generateFinalPdf as any);
router.get('/projects/:id/pdf/versions', getPdfVersions as any);
router.post('/projects/:id/packages', compileFilingPackage as any);
router.get('/projects/:id/packages', getFilingPackages as any);
router.get('/projects/:id/pipeline', getPipelineProgress as any);

import {
  handleCopilotChat,
  handleGetCompanyMemory,
  handleUpdateCompanyMemory,
  handleGetMemoryConflicts,
  handleResolveConflict,
  handleGetGraphNeighborhood,
  handleTraceFactLineage,
  handleRunReconciliation,
  handleGetReconciliations
} from '../controllers/copilotController';

// Phase 6 Reviewer Copilot, Memory, Graph & Reconciliations APIs
router.post('/copilot/chat-session', handleCopilotChat as any);
router.get('/companies/:id/memory', handleGetCompanyMemory as any);
router.post('/companies/:id/memory', handleUpdateCompanyMemory as any);
router.get('/companies/:id/memory/conflicts', handleGetMemoryConflicts as any);
router.post('/memory/conflicts/:conflictId/resolve', handleResolveConflict as any);
router.get('/graph/neighborhood', handleGetGraphNeighborhood as any);
router.get('/graph/path', handleTraceFactLineage as any);
router.post('/projects/:id/reconcile', handleRunReconciliation as any);
router.get('/projects/:id/reconciliations-run', handleGetReconciliations as any);

export default router;

