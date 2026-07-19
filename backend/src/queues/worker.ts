import { Worker, Job } from 'bullmq';
import prisma from '../config/db';
import redis from '../config/redis';
import { emitToProject, emitToUser } from '../services/socketService';
import { extractDocumentContent } from '../services/extractor';
import { reEvaluateProjectValidations } from '../services/validationService';

export const startWorker = () => {
  const worker = new Worker(
    'document-processing',
    async (job: Job) => {
      const { documentId, filePath } = job.data;
      console.log(`[Worker] Started processing document: ${documentId} (Job ID: ${job.id})`);

      const jobId = job.id || `job-${Date.now()}`;

      try {
        // Step 1: Update status to PROCESSING
        const doc = await prisma.companyDocument.update({
          where: { id: documentId },
          data: { status: 'PROCESSING', processingStatus: 'RUNNING' },
          include: { project: true },
        });

        // Register ProcessingJob
        await prisma.processingJob.upsert({
          where: { jobId },
          update: {
            status: 'RUNNING',
            progress: 10,
            metadataJson: JSON.stringify({ stage: 'OCR Scanning' }),
          },
          create: {
            jobId,
            organizationId: doc.project.organizationId,
            projectId: doc.projectId,
            documentId,
            type: 'DOCUMENT_INGEST',
            status: 'RUNNING',
            progress: 10,
            metadataJson: JSON.stringify({ stage: 'OCR Scanning' }),
            startedAt: new Date(),
          },
        });

        emitToProject(doc.projectId, 'document-status', {
          documentId,
          status: 'PROCESSING',
          progress: 10,
          stage: 'OCR Scanning',
        });

        await prisma.auditLog.create({
          data: {
            email: 'SYSTEM',
            action: 'OCR_STARTED',
            targetId: documentId,
            targetType: 'Document',
            details: JSON.stringify({ name: doc.name, stage: 'OCR Scanning' }),
          },
        });

        // Simulate layout and table boundary OCR detection
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Step 2: Extraction Stage
        emitToProject(doc.projectId, 'document-status', {
          documentId,
          status: 'PROCESSING',
          progress: 40,
          stage: 'Fact Extraction',
        });

        await prisma.processingJob.update({
          where: { jobId },
          data: {
            progress: 40,
            metadataJson: JSON.stringify({ stage: 'Fact Extraction' }),
          },
        });

        const fileTypeLower = doc.fileType.toLowerCase();
        const extractedFacts = await extractDocumentContent(filePath, fileTypeLower);

        const statement = await prisma.financialStatement.create({
          data: {
            projectId: doc.projectId,
            type: 'BALANCE_SHEET',
            status: 'DRAFT',
          },
        });

        // Mapped tag baseline dictionary
        const tagMap: Record<string, string> = {
          'Assets': 'mca-indas:Assets',
          'Equity': 'mca-indas:Equity',
          'Liabilities': 'mca-indas:Liabilities',
          'Revenue': 'mca-indas:RevenueFromOperations',
          'NetProfit': 'mca-indas:ProfitLossForPeriod'
        };

        for (const item of extractedFacts) {
          const tag = tagMap[item.label] || `mca-indas:${item.label}`;
          
          const parsedFact = await prisma.parsedFact.create({
            data: {
              projectId: doc.projectId,
              financialStatementId: statement.id,
              factKey: item.label,
              factValue: item.parsedValue.toString(),
              unit: 'INR',
              period: doc.financialYear,
              confidence: 98.5,
              xmlTag: tag,
            },
          });

          // Create Taxonomy Mapping
          await prisma.taxonomyMapping.create({
            data: {
              parsedFactId: parsedFact.id,
              elementId: `element-${item.label.toLowerCase()}`,
              elementName: tag,
              taxonomyType: 'IndAS',
              confidence: 99.0,
            },
          });

          // Create Evidence
          await prisma.evidence.create({
            data: {
              factId: parsedFact.id,
              documentId: doc.id,
              pageNumber: 1,
              sourceSnippet: item.lineContext,
              evidenceType: 'OCR_HIGHLIGHT',
              confidence: 98.5,
            },
          });
        }

        // Simulate Taxonomy Mapping Linkbase matching
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Step 4: Compliance Validation
        emitToProject(doc.projectId, 'document-status', {
          documentId,
          status: 'PROCESSING',
          progress: 80,
          stage: 'Compliance Validation',
        });

        await prisma.processingJob.update({
          where: { jobId },
          data: {
            progress: 80,
            metadataJson: JSON.stringify({ stage: 'Compliance Validation' }),
          },
        });

        // Run structured validations
        await reEvaluateProjectValidations(doc.projectId);

        // Add history memory for this company
        await prisma.companyMemory.create({
          data: {
            companyCin: doc.companyId,
            category: "MAPPINGS",
            keyName: "historical_assets_mapping",
            dataValue: JSON.stringify({ factKey: "Assets", mappedElement: "mca-indas:Assets", confidence: 98.5 }),
            financialYear: doc.financialYear,
          },
        });

        // Simulate final package compilation checks
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Step 5: Processed Completion
        await prisma.companyDocument.update({
          where: { id: documentId },
          data: { status: 'PROCESSED', processingStatus: 'SUCCEEDED' },
        });

        await prisma.processingJob.update({
          where: { jobId },
          data: {
            status: 'SUCCEEDED',
            progress: 100,
            completedAt: new Date(),
            metadataJson: JSON.stringify({ stage: 'Completed', factsCount: extractedFacts.length }),
          },
        });

        // Update project stage
        await prisma.project.update({
          where: { id: doc.projectId },
          data: { currentStage: 'REVIEW_REQUIRED' },
        });

        await prisma.auditLog.create({
          data: {
            email: 'SYSTEM',
            action: 'PARSING_COMPLETED',
            targetId: documentId,
            targetType: 'Document',
            details: JSON.stringify({ name: doc.name, status: 'PROCESSED' }),
          },
        });

        emitToProject(doc.projectId, 'document-status', {
          documentId,
          status: 'PROCESSED',
          progress: 100,
          stage: 'Completed',
        });

        await prisma.notification.create({
          data: {
            userId: doc.uploadedById,
            title: "Parsing Completed",
            message: `Document "${doc.name}" has been successfully parsed and is ready for review.`,
          },
        });

        emitToUser(doc.uploadedById, 'notification', {
          title: "Parsing Completed",
          message: `Document "${doc.name}" has been successfully parsed and is ready for review.`,
        });

        console.log(`[Worker] Finished processing document: ${documentId}`);
      } catch (err: any) {
        console.error(`[Worker] Error processing job ${job.id}:`, err);
        await prisma.companyDocument.update({
          where: { id: documentId },
          data: { status: 'FAILED', processingStatus: 'FAILED' },
        });

        await prisma.processingJob.update({
          where: { jobId },
          data: {
            status: 'FAILED',
            progress: 100,
            errorCode: 'EXTRACTION_ERROR',
            errorMessage: err.message || 'Error occurred during parsing',
            completedAt: new Date(),
          },
        });

        emitToProject(job.data.projectId, 'document-status', {
          documentId,
          status: 'FAILED',
          progress: 100,
          stage: 'Failed processing document',
        });
      }
    },
    {
      connection: redis as any,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err);
  });

  console.log('[Worker] BullMQ Worker started successfully.');
  return worker;
};
