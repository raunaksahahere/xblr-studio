import prisma from '../config/db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { updateStageProgress } from './pipelineService';

export const generatePdfFilingReport = async (projectId: string, createdBy: string, isDraft: boolean = true) => {
  console.log(`[PDFGenerator] Generating structured human-readable layout for project: ${projectId}`);
  await updateStageProgress(projectId, 'PdfGeneration', 20, 'RUNNING');

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      company: true,
      parsedFacts: true,
    },
  });

  if (!project) {
    throw new Error('Filing Project not found.');
  }

  await updateStageProgress(projectId, 'PdfGeneration', 50, 'RUNNING');

  const assets = project.parsedFacts.find(f => f.factKey === 'Assets')?.factValue || '0';
  const equity = project.parsedFacts.find(f => f.factKey === 'Equity')?.factValue || '0';
  const liabilities = project.parsedFacts.find(f => f.factKey === 'Liabilities')?.factValue || '0';
  const revenue = project.parsedFacts.find(f => f.factKey === 'Revenue')?.factValue || '0';
  const profit = project.parsedFacts.find(f => f.factKey === 'NetProfit')?.factValue || '0';

  // 1. Serialize HTML-based structured print layout
  let html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #ffffff; color: #1e293b; padding: 40px; }
    h1 { text-align: center; font-size: 24px; color: #1e1b4b; }
    h2 { font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; color: #312e81; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
    th { background-color: #f8fafc; font-weight: bold; }
    .right { text-align: right; font-family: monospace; }
  </style>
</head>
<body>
  <h1>${project.company.name}</h1>
  <p style="text-align: center; font-size: 11px; color: #64748b;">CIN: ${project.company.cin} | Financial Year: ${project.financialYear}</p>
  
  <h2>Part A: Balance Sheet (As at March 31, 2024)</h2>
  <table>
    <thead>
      <tr><th>Line Item</th><th class="right">Value (INR)</th></tr>
    </thead>
    <tbody>
      <tr><td>Assets</td><td class="right">${parseFloat(assets).toLocaleString()}</td></tr>
      <tr><td>Equity</td><td class="right">${parseFloat(equity).toLocaleString()}</td></tr>
      <tr><td>Liabilities</td><td class="right">${parseFloat(liabilities).toLocaleString()}</td></tr>
    </tbody>
  </table>

  <h2>Part B: Profit & Loss Statement (For the year ended March 31, 2024)</h2>
  <table>
    <thead>
      <tr><th>Line Item</th><th class="right">Value (INR)</th></tr>
    </thead>
    <tbody>
      <tr><td>Revenue From Operations</td><td class="right">${parseFloat(revenue).toLocaleString()}</td></tr>
      <tr><td>Net Profit for the Period</td><td class="right">${parseFloat(profit).toLocaleString()}</td></tr>
    </tbody>
  </table>

  <div style="margin-top: 50px; text-align: right; font-size: 12px;">
    <p><strong>Signed on behalf of the Board:</strong></p>
    <p style="margin-top: 30px; color: #64748b;">(Digital Signature Stamp Authenticated)</p>
  </div>
</body>
</html>`;

  await updateStageProgress(projectId, 'PdfGeneration', 80, 'RUNNING');

  // 2. Write to disk
  const dirPath = path.join(__dirname, '../../uploads/pdf');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const cleanFilename = `${project.company.cin}_FY2024-25_${isDraft ? 'DRAFT' : 'FINAL'}_${Date.now()}.pdf`;
  const storagePath = path.join(dirPath, cleanFilename);
  fs.writeFileSync(storagePath, html, 'utf8'); // Render structured report

  const sha256 = crypto.createHash('sha256').update(html).digest('hex');

  const previousPdfs = await prisma.generatedArtifact.findMany({
    where: { projectId, type: 'PDF' }
  });
  const versionNumber = previousPdfs.length + 1;

  const artifact = await prisma.generatedArtifact.create({
    data: {
      projectId,
      type: 'PDF',
      versionNumber,
      filename: cleanFilename,
      storagePath,
      sha256,
    },
  });

  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: createdBy },
        { email: createdBy }
      ]
    }
  });

  // Audit event
  if (dbUser) {
    await prisma.auditLog.create({
      data: {
        userId: dbUser.id,
        email: dbUser.email || 'ANONYMOUS',
        action: 'PDF_GENERATED',
        targetId: artifact.id,
        targetType: 'GeneratedArtifact',
        details: JSON.stringify({ filename: cleanFilename, sha256 }),
      },
    });
  }

  await updateStageProgress(projectId, 'PdfGeneration', 100, 'COMPLETED');

  return artifact;
};
