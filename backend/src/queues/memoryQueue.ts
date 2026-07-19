import prisma from '../config/db';
import { emitToProject, emitToUser } from '../services/socketService';
import { extractDocumentContent } from '../services/extractor';
import { getTaxonomyMapping } from '../services/taxonomyService';
import { runFilingValidations, FinancialFactData } from '../services/validationService';

export const addDocumentJobMemory = async (documentId: string, filePath: string) => {
  const jobId = `job-${Date.now()}-${Math.round(Math.random() * 1e5)}`;
  console.log(`[MemoryQueue] Queueing processing for document: ${documentId} (Job ID: ${jobId})`);

  // Fetch document details to get project context
  const targetDoc = await prisma.companyDocument.findUnique({
    where: { id: documentId },
    include: { project: true },
  });

  if (!targetDoc) {
    console.error(`[MemoryQueue] Document ${documentId} not found in database.`);
    return;
  }

  // Create initial ProcessingJob record
  await prisma.processingJob.create({
    data: {
      jobId,
      organizationId: targetDoc.project.organizationId,
      projectId: targetDoc.projectId,
      documentId,
      type: 'DOCUMENT_INGEST',
      status: 'QUEUED',
      progress: 0,
      startedAt: new Date(),
    },
  });

  setTimeout(async () => {
    try {
      // Step 1: Update status to PROCESSING
      const doc = await prisma.companyDocument.update({
        where: { id: documentId },
        data: { status: 'PROCESSING', processingStatus: 'RUNNING' },
        include: { project: true },
      });

      await prisma.processingJob.update({
        where: { jobId },
        data: {
          status: 'RUNNING',
          progress: 10,
          metadataJson: JSON.stringify({ stage: 'OCR Scanning' }),
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

      // Call actual document text parser
      const extractedTerms = await extractDocumentContent(doc.fileUrl, doc.fileType);

      // Create a financial statement container
      const statement = await prisma.financialStatement.create({
        data: {
          projectId: doc.projectId,
          type: 'BALANCE_SHEET',
          status: 'DRAFT',
        },
      });

      const factsList: FinancialFactData[] = [];

      for (const term of extractedTerms) {
        // Query CompanyMemory to check if there is a learned reviewer override/correction
        const memoryKey = `override:${term.label}`;
        const historicalCorrection = await prisma.companyMemory.findFirst({
          where: {
            companyCin: doc.companyId,
            category: 'CORRECTION',
            keyName: memoryKey,
          },
        });

        let finalValue = term.parsedValue;
        let confidence = term.label ? 94.5 : 70.0;

        if (historicalCorrection) {
          try {
            const memoryData = JSON.parse(historicalCorrection.dataValue);
            if (memoryData && typeof memoryData.overrideValue === 'number') {
              finalValue = memoryData.overrideValue;
              confidence = 100.0; // Learned memory has absolute confidence
              console.log(`[MemoryQueue] Learned override found in CompanyMemory for ${term.label}. Auto-applying value: ${finalValue}`);
            }
          } catch (e) {
            // Ignore corrupted memory records
          }
        }

        const mappingInfo = getTaxonomyMapping(term.label);

        // Insert ParsedFact row
        const parsedFact = await prisma.parsedFact.create({
          data: {
            projectId: doc.projectId,
            financialStatementId: statement.id,
            factKey: term.label,
            factValue: finalValue.toString(),
            unit: 'INR',
            period: doc.financialYear,
            confidence: confidence,
            xmlTag: mappingInfo.mcaElement,
          },
        });

        // Insert TaxonomyMapping row
        await prisma.taxonomyMapping.create({
          data: {
            parsedFactId: parsedFact.id,
            elementId: `element-${term.label.toLowerCase()}`,
            elementName: mappingInfo.mcaElement,
            taxonomyType: 'IndAS',
            confidence: mappingInfo.confidence * 100.0,
          },
        });

        // Create Evidence
        await prisma.evidence.create({
          data: {
            factId: parsedFact.id,
            documentId: doc.id,
            pageNumber: 1,
            sourceSnippet: term.lineContext,
            evidenceType: 'OCR_HIGHLIGHT',
            confidence: confidence,
          },
        });

        factsList.push({
          name: term.label,
          value: finalValue,
        });
      }

      // Step 3: Validation Stage
      emitToProject(doc.projectId, 'document-status', {
        documentId,
        status: 'PROCESSING',
        progress: 70,
        stage: 'Compliance Validation',
      });

      await prisma.processingJob.update({
        where: { jobId },
        data: {
          progress: 70,
          metadataJson: JSON.stringify({ stage: 'Compliance Validation' }),
        },
      });

      // Clear any existing errors for this document first
      await prisma.validationError.deleteMany({
        where: { documentId },
      });

      // Run compliance calculation check rules
      const validationResults = runFilingValidations(factsList);

      for (const err of validationResults) {
        await prisma.validationError.create({
          data: {
            projectId: doc.projectId,
            documentId,
            errorCode: err.errorCode,
            message: err.message,
            severity: err.severity,
          },
        });
      }

      // Record this run's taxonomy layout configurations in CompanyMemory for future recall
      for (const term of extractedTerms) {
        const mappingInfo = getTaxonomyMapping(term.label);
        const existingMem = await prisma.companyMemory.findFirst({
          where: {
            companyCin: doc.companyId,
            category: 'MAPPINGS',
            keyName: `mapping:${term.label}`,
          },
        });

        if (existingMem) {
          await prisma.companyMemory.update({
            where: { id: existingMem.id },
            data: {
              dataValue: JSON.stringify({ mcaElement: mappingInfo.mcaElement, rawLabel: term.lineContext }),
              financialYear: doc.financialYear,
            },
          });
        } else {
          await prisma.companyMemory.create({
            data: {
              companyCin: doc.companyId,
              category: 'MAPPINGS',
              keyName: `mapping:${term.label}`,
              dataValue: JSON.stringify({ mcaElement: mappingInfo.mcaElement, rawLabel: term.lineContext }),
              financialYear: doc.financialYear,
            },
          });
        }
      }

      // Step 4: Complete
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
          metadataJson: JSON.stringify({ stage: 'Completed', factsCount: extractedTerms.length }),
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

      console.log(`[MemoryQueue] Finished processing document: ${documentId}`);
    } catch (err: any) {
      console.error(`[MemoryQueue] Error processing document:`, err);
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

      emitToProject(documentId, 'document-status', {
        documentId,
        status: 'FAILED',
        progress: 100,
        stage: 'Failed',
      });
    }
  }, 1000);
};
