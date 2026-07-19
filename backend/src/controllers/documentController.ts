import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { addDocumentJob } from '../queues/documentQueue';
import { extractArchiveSecurely } from '../services/archiveService';

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + cleanName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.docx', '.xlsx', '.csv', '.xml', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOCX, XLSX, CSV, XML, ZIP'));
    }
  },
});

// Helper: Calculate file SHA-256 checksum
const calculateChecksum = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

export const uploadDocument = async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, companyId, financialYear, periodScope = 'CURRENT', overrideDuplicate = 'false' } = req.body;
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    if (!projectId || !companyId || !financialYear) {
      return res.status(400).json({ error: 'Missing projectId, companyId, or financialYear.' });
    }

    const fileType = path.extname(file.originalname).substring(1).toUpperCase();
    const checksum = await calculateChecksum(file.path);

    // Duplicate Check
    const existingSameHash = await prisma.companyDocument.findFirst({
      where: {
        projectId,
        checksumSha256: checksum,
      },
    });

    if (existingSameHash && overrideDuplicate !== 'true') {
      // Clean up uploaded file
      try {
        fs.unlinkSync(file.path);
      } catch (err) {}

      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_DETECTED',
          message: `Duplicate file detected: '${file.originalname}' has the same checksum as an existing document.`,
          duplicateDocumentId: existingSameHash.id,
        },
      });
    }

    const uploadPath = path.join(__dirname, '../../uploads');

    if (fileType === 'ZIP') {
      // 1. Create Parent Archive document record
      const parentDoc = await prisma.companyDocument.create({
        data: {
          projectId,
          companyId,
          financialYear,
          name: file.originalname,
          originalFilename: file.originalname,
          storedFilename: file.filename,
          fileType: 'ZIP',
          fileUrl: file.path,
          fileSize: file.size,
          checksumSha256: checksum,
          periodScope: periodScope,
          documentClass: 'ARCHIVE',
          status: 'PROCESSED',
          processingStatus: 'SUCCEEDED',
          uploadedById: req.user?.id || 'SYSTEM',
        },
      });

      // 2. Extract Archive Content
      const extractedDest = path.join(uploadPath, `extracted-${parentDoc.id}`);
      const extractedFiles = await extractArchiveSecurely(file.path, extractedDest);

      let createdCount = 0;
      let duplicateCount = 0;

      for (const extracted of extractedFiles) {
        // Check duplicate within the project for the extracted file
        const childDup = await prisma.companyDocument.findFirst({
          where: {
            projectId,
            checksumSha256: extracted.checksumSha256,
          },
        });

        const childDoc = await prisma.companyDocument.create({
          data: {
            projectId,
            companyId,
            financialYear,
            name: extracted.originalFilename,
            originalFilename: extracted.originalFilename,
            storedFilename: extracted.storedFilename,
            fileType: extracted.fileType,
            fileUrl: extracted.fileUrl,
            fileSize: extracted.fileSize,
            checksumSha256: extracted.checksumSha256,
            periodScope: periodScope,
            documentClass: 'UNKNOWN',
            parentDocumentId: parentDoc.id,
            sourceArchiveId: parentDoc.id,
            folderPath: extracted.folderPath,
            isDuplicate: !!childDup,
            duplicateOfDocumentId: childDup ? childDup.id : null,
            status: childDup ? 'PROCESSED' : 'PENDING',
            processingStatus: childDup ? 'SUCCEEDED' : 'PENDING',
            uploadedById: req.user?.id || 'SYSTEM',
          },
        });

        if (childDup) {
          duplicateCount++;
        } else {
          createdCount++;
          // Queue for processing
          await addDocumentJob(childDoc.id, childDoc.fileUrl);
        }
      }

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          email: req.user?.email || 'ANONYMOUS',
          action: 'ARCHIVE_EXTRACTED',
          targetId: parentDoc.id,
          targetType: 'Document',
          details: JSON.stringify({ name: file.originalname, extracted: extractedFiles.length, duplicates: duplicateCount }),
        },
      });

      return res.status(201).json({
        message: `Archive extracted. ${createdCount} new files queued, ${duplicateCount} duplicates ignored.`,
        parentDocument: parentDoc,
        extractedCount: extractedFiles.length,
      });
    }

    // Single non-zip document processing
    let document;
    let versionNumber = 1;

    // Check if the name matches to create a new version
    const existingDocByName = await prisma.companyDocument.findFirst({
      where: {
        projectId,
        name: file.originalname,
      },
      include: {
        versions: true,
      },
    });

    if (existingDocByName) {
      versionNumber = existingDocByName.versions.length + 1;

      document = await prisma.companyDocument.update({
        where: { id: existingDocByName.id },
        data: {
          fileUrl: file.path,
          fileSize: file.size,
          checksumSha256: checksum,
          periodScope: periodScope,
          status: 'PENDING',
          processingStatus: 'PENDING',
          updatedAt: new Date(),
          version: versionNumber,
        },
      });

      await prisma.documentVersion.create({
        data: {
          companyDocumentId: document.id,
          versionNumber,
          fileUrl: file.path,
          fileSize: file.size,
          createdById: req.user?.id || 'SYSTEM',
        },
      });
    } else {
      document = await prisma.companyDocument.create({
        data: {
          projectId,
          companyId,
          financialYear,
          name: file.originalname,
          originalFilename: file.originalname,
          storedFilename: file.filename,
          fileType,
          fileUrl: file.path,
          fileSize: file.size,
          checksumSha256: checksum,
          periodScope: periodScope,
          status: 'PENDING',
          processingStatus: 'PENDING',
          uploadedById: req.user?.id || 'SYSTEM',
        },
      });

      await prisma.documentVersion.create({
        data: {
          companyDocumentId: document.id,
          versionNumber: 1,
          fileUrl: file.path,
          fileSize: file.size,
          createdById: req.user?.id || 'SYSTEM',
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        email: req.user?.email || 'ANONYMOUS',
        action: 'UPLOAD',
        targetId: document.id,
        targetType: 'Document',
        details: JSON.stringify({ name: file.originalname, version: versionNumber, size: file.size, periodScope }),
      },
    });

    await addDocumentJob(document.id, file.path);

    res.status(201).json({
      message: 'Document uploaded and queued for parsing.',
      document,
      version: versionNumber,
    });
  } catch (error: any) {
    console.error('Upload Document Error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload document.' });
  }
};

export const getDocumentsByProject = async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;

  try {
    const documents = await prisma.companyDocument.findMany({
      where: { projectId },
      include: {
        versions: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
};

export const downloadDocument = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    if (id.endsWith('.xml')) {
      const activeProject = await prisma.project.findFirst({
        where: {
          organizationId: req.user?.organizationId,
        },
        include: {
          company: true,
        },
      });

      if (!activeProject) {
        return res.status(404).json({ error: 'Filing project scope not found.' });
      }

      const { processProjectXBRL } = require('../services/xbrlProcessor');
      const xmlString = await processProjectXBRL({
        projectId: activeProject.id,
        cin: activeProject.company.cin,
        financialYear: activeProject.financialYear,
      });

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename=${id}`);
      return res.send(xmlString);
    }

    if (id.endsWith('.zip')) {
      const activeProject = await prisma.project.findFirst({
        where: {
          organizationId: req.user?.organizationId,
        },
      });

      if (!activeProject) {
        return res.status(404).json({ error: 'Filing project scope not found.' });
      }

      const { compileFilingBundle } = require('../services/packageService');
      const zipBuffer = await compileFilingBundle(activeProject.id);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${id}`);
      return res.send(zipBuffer);
    }

    const document = await prisma.companyDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (!fs.existsSync(document.fileUrl)) {
      return res.status(404).json({ error: 'Physical file not found on disk.' });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        email: req.user?.email || 'ANONYMOUS',
        action: 'DOWNLOAD',
        targetId: document.id,
        targetType: 'Document',
        details: JSON.stringify({ name: document.name }),
      },
    });

    res.download(document.fileUrl, document.name);
  } catch (error) {
    console.error('[DownloadController] Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download file.' });
  }
};
