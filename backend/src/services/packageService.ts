import prisma from '../config/db';
import { processProjectXBRL } from './xbrlProcessor';
import AdmZip from 'adm-zip';

export const compileFilingBundle = async (projectId: string): Promise<Buffer> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      company: true,
      validationErrors: true,
      reviewActions: true,
      financialStatements: {
        include: {
          parsedFacts: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error('Project scope not found in database.');
  }

  // 1. Generate compliant XBRL XML instance
  const xmlContent = await processProjectXBRL({
    projectId: project.id,
    cin: project.company.cin,
    financialYear: project.financialYear,
  });

  // 2. Generate PDF Contents (Standard text/HTML report bytes representing human-readable financials)
  const factsList = project.financialStatements.flatMap(s => s.parsedFacts);
  const pdfFinancialsContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj
4 0 obj
<< /Length 500 >>
stream
BT
/F1 18 Tf
50 750 Td
(AI XBRL Studio - Human Readable Financial Statements) Tj
/F1 12 Tf
0 -40 Td
(Company Name: ${project.company.name}) Tj
0 -20 Td
(CIN: ${project.company.cin}) Tj
0 -20 Td
(Financial Year: ${project.financialYear}) Tj
0 -40 Td
(FINANCIAL BALANCE SHEET & PROFIT LOSS) Tj
${factsList.map((f, i) => `0 -20 Td\n(${f.factKey}: ${f.factValue} INR [IndAS matched: ${f.xmlTag}]) Tj`).join('\n')}
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000119 00000 n 
0000000280 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
820
%%EOF
`;

  // 3. Generate Validation PDF Content
  const pdfValidationContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj
4 0 obj
<< /Length 500 >>
stream
BT
/F1 18 Tf
50 750 Td
(AI XBRL Studio - Compliance Validation Report) Tj
/F1 12 Tf
0 -40 Td
(Filing Compliance Status Summary:) Tj
0 -30 Td
(Active warnings / errors: ${project.validationErrors.length}) Tj
${project.validationErrors.map((e) => `0 -20 Td\n([${e.errorCode}] ${e.severity}: ${e.message}) Tj`).join('\n')}
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000119 00000 n 
0000000280 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
820
%%EOF
`;

  // 4. Generate metadata details
  const metadataJson = JSON.stringify({
    cin: project.company.cin,
    companyName: project.company.name,
    financialYear: project.financialYear,
    reportingFramework: 'IndAS',
    generationDate: new Date().toISOString(),
    factsCount: factsList.length,
    validationStatus: project.validationErrors.length === 0 ? 'PASSED' : 'WARNINGS_PRESENT',
    extractedFacts: factsList.map(f => ({ key: f.factKey, value: f.factValue, tag: f.xmlTag })),
  }, null, 2);

  // 5. Create ZIP Archive
  const zip = new AdmZip();
  zip.addFile('Company_Financials.xml', Buffer.from(xmlContent, 'utf-8'));
  zip.addFile('Company_Financials.pdf', Buffer.from(pdfFinancialsContent, 'binary'));
  zip.addFile('Validation_Report.pdf', Buffer.from(pdfValidationContent, 'binary'));
  zip.addFile('Filing_Metadata.json', Buffer.from(metadataJson, 'utf-8'));

  return zip.toBuffer();
};
