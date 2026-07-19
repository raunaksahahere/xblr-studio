const fs = require('fs');
const path = require('path');
const AdmZip = require('./backend/node_modules/adm-zip');

const BaseUrl = 'http://localhost:5000/api';

async function run() {
  console.log('=========================================');
  console.log('  AI XBRL Studio Taxonomy & Packaging E2E');
  console.log('=========================================');

  // 1. Authenticate as Admin
  let token;
  try {
    const loginRes = await fetch(`${BaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@xbrlstudio.com',
        password: 'AdminSecretPass123'
      })
    });
    const loginData = await loginRes.json();
    token = loginData.accessToken;
    console.log('✔ Admin authenticated successfully!');
  } catch (err) {
    console.error('✖ Auth failed:', err.message);
    process.exit(1);
  }

  const headers = { 'Authorization': `Bearer ${token}` };

  // 2. Fetch active projects
  let projectId;
  try {
    const projectsRes = await fetch(`${BaseUrl}/projects`, { headers });
    const projects = await projectsRes.json();
    if (projects.length === 0) {
      console.error('✖ No active projects found. Please run test_api_flow.js first to parse document facts.');
      process.exit(1);
    }
    projectId = projects[0].id;
    console.log(`✔ Selected active Project ID: ${projectId}`);
  } catch (err) {
    console.error('✖ Querying projects failed:', err.message);
    process.exit(1);
  }

  // 3. Download XBRL XML Instance Document
  console.log('\n[Test 1] Downloading XBRL XML Instance...');
  try {
    const xmlRes = await fetch(`${BaseUrl}/documents/company_filing.xml/download`, { headers });
    const xmlText = await xmlRes.text();
    
    if (!xmlRes.ok) throw new Error(xmlText);

    // Verify critical tags are serialized correctly in the Object Model
    const hasXbrlRoot = xmlText.includes('<xbrli:xbrl');
    const hasSchemaRef = xmlText.includes('<link:schemaRef');
    const hasContexts = xmlText.includes('<xbrli:context');
    const hasUnits = xmlText.includes('<xbrli:unit');
    const hasFacts = xmlText.includes('mca-indas:Assets') && xmlText.includes('mca-indas:Liabilities');

    console.log(`✔ Root namespace matches XBRL specification: ${hasXbrlRoot}`);
    console.log(`✔ SchemaRef entry links to MCA Entry Schema: ${hasSchemaRef}`);
    console.log(`✔ Canonical contexts mapped: ${hasContexts}`);
    console.log(`✔ Unit currencies defined: ${hasUnits}`);
    console.log(`✔ Fact values serialized: ${hasFacts}`);

    if (hasXbrlRoot && hasSchemaRef && hasContexts && hasUnits && hasFacts) {
      console.log('✔ XBRL INSTANCE XML VALIDATED SUCCESSFULLY!');
    } else {
      throw new Error('XBRL XML structure is missing mandatory namespaces/facts.');
    }
  } catch (err) {
    console.error('✖ XML Download check failed:', err.message);
    process.exit(1);
  }

  // 4. Download and unpack ZIP Filing Package
  console.log('\n[Test 2] Downloading ZIP Filing Package...');
  try {
    const zipRes = await fetch(`${BaseUrl}/documents/reliance_xbrl_fy24_25_filing.zip/download`, { headers });
    if (!zipRes.ok) {
      const errText = await zipRes.text();
      throw new Error(errText);
    }

    const arrayBuffer = await zipRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    console.log(`✔ Received zip package containing ${zipEntries.length} files.`);
    const fileNames = zipEntries.map(e => e.entryName);
    console.log('  Files in bundle:', fileNames.join(', '));

    const hasXml = fileNames.includes('Company_Financials.xml');
    const hasPdf = fileNames.includes('Company_Financials.pdf');
    const hasValPdf = fileNames.includes('Validation_Report.pdf');
    const hasMeta = fileNames.includes('Filing_Metadata.json');

    if (hasXml && hasPdf && hasValPdf && hasMeta) {
      console.log('✔ FILING ZIP PACKAGE VALIDATED SUCCESSFULLY!');
    } else {
      throw new Error('Filing bundle is missing mandatory reports/XML files.');
    }

    // Verify metadata inside the package
    const metaEntry = zip.getEntry('Filing_Metadata.json');
    const metaData = JSON.parse(metaEntry.getData().toString('utf8'));
    console.log(`✔ Metadata check - Reporting Framework: ${metaData.reportingFramework}`);
    console.log(`✔ Metadata check - Company CIN: ${metaData.cin}`);
  } catch (err) {
    console.error('✖ ZIP Packaging check failed:', err.message);
    process.exit(1);
  }

  console.log('\n=========================================');
  console.log('  ALL TAXONOMY & PACKAGING TESTS PASSED!');
  console.log('=========================================');
}

run();
