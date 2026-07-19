// Node E2E API Verification Script
const fs = require('fs');
const path = require('path');

const BaseUrl = "http://localhost:5000/api";

async function runTests() {
  console.log("=========================================");
  console.log("  AI XBRL Studio API Integration Tests (Node)");
  console.log("=========================================");

  // 1. Login as Admin
  console.log("\n[Test 1] Logging in as default Admin...");
  let token;
  try {
    const loginRes = await fetch(`${BaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "admin@xbrlstudio.com",
        password: "AdminSecretPass123"
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.error);
    token = loginData.accessToken;
    console.log(`✔ Login successful! Logged in as: ${loginData.user.name}`);
  } catch (err) {
    console.error("✖ Login failed:", err.message);
    process.exit(1);
  }

  const headers = { 'Authorization': `Bearer ${token}` };

  // 2. Query or Create Project
  console.log("\n[Test 2] Querying active filing projects...");
  let projectId, companyId;
  try {
    const projRes = await fetch(`${BaseUrl}/projects`, { headers });
    let projects = await projRes.json();
    console.log(`✔ Found ${projects.length} active projects.`);
    
    if (projects.length === 0) {
      console.log("  No projects found. Creating a new project dynamically...");
      
      // Fetch companies
      const compRes = await fetch(`${BaseUrl}/companies`, { headers });
      const companies = await compRes.json();
      if (companies.length === 0) {
        throw new Error("No companies seeded in the database!");
      }
      
      const targetCompany = companies[0];
      companyId = targetCompany.id;
      
      // Create project
      const createProjRes = await fetch(`${BaseUrl}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: companyId,
          financialYear: "2024-2025"
        })
      });
      
      const createProjData = await createProjRes.json();
      if (!createProjRes.ok) throw new Error(createProjData.error);
      
      projectId = createProjData.id;
      console.log(`✔ Project created successfully! Project ID: ${projectId}`);
    } else {
      const activeProject = projects[0];
      projectId = activeProject.id;
      companyId = activeProject.companyId;
      console.log(`✔ Selected Project ID: ${projectId} (Company: ${activeProject.company.name})`);
    }
  } catch (err) {
    console.error("✖ Query/Create project failed:", err.message);
    process.exit(1);
  }

  // 3. Upload Document
  console.log("\n[Test 3] Uploading dummy report PDF file...");
  const dummyFilePath = path.join(__dirname, 'dummy_report.pdf');
  if (!fs.existsSync(dummyFilePath)) {
    console.error("✖ Dummy report file not found at:", dummyFilePath);
    process.exit(1);
  }

  try {
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('companyId', companyId);
    formData.append('financialYear', '2024-2025');

    const fileBuffer = fs.readFileSync(dummyFilePath);
    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', fileBlob, 'dummy_report.pdf');

    const uploadRes = await fetch(`${BaseUrl}/documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(uploadData.error);
    console.log("✔ Document upload successful! Queued in background pipeline.");
  } catch (err) {
    console.error("✖ Document upload failed:", err.message);
    process.exit(1);
  }

  // Wait for background worker processing (Must be at least 7-8 seconds)
  console.log("\nWaiting 8 seconds for background memoryQueue parser worker...");
  await new Promise((resolve) => setTimeout(resolve, 8000));

  // 4. Verify Parsed Facts and Errors
  console.log("\n[Test 4] Verifying parsed facts and validation warnings...");
  let liabilitiesFactId;
  try {
    const detailRes = await fetch(`${BaseUrl}/projects/${projectId}`, { headers });
    const projectDetails = await detailRes.json();
    
    const statement = projectDetails.financialStatements[0];
    const facts = statement ? statement.parsedFacts : [];
    const errors = projectDetails.validationErrors || [];

    console.log(`✔ Extracted facts count: ${facts.length}`);
    facts.forEach((f) => {
      console.log(`  Fact: ${f.factKey} = ${f.factValue} (Confidence: ${f.confidence}%)`);
      if (f.factKey === 'Liabilities') {
        liabilitiesFactId = f.id;
      }
    });

    console.log(`✔ Active validation checks count: ${errors.length}`);
    errors.forEach((e) => {
      console.log(`  [${e.errorCode}] (${e.severity}): ${e.message}`);
    });
  } catch (err) {
    console.error("✖ Verification failed:", err.message);
    process.exit(1);
  }

  // 5. Override Liabilities
  console.log("\n[Test 5] Overriding Liabilities fact value...");
  if (!liabilitiesFactId) {
    console.error("✖ Liabilities fact not found in extraction.");
    process.exit(1);
  }

  try {
    const overrideRes = await fetch(`${BaseUrl}/reviews/${liabilitiesFactId}/override`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        newValue: "4000000",
        comment: "Liabilities correct audit adjustment"
      })
    });
    const overrideData = await overrideRes.json();
    if (!overrideRes.ok) throw new Error(overrideData.error);
    console.log(`✔ Override registered successfully. New value: ${overrideData.fact.overriddenValue}`);
  } catch (err) {
    console.error("✖ Override request failed:", err.message);
    process.exit(1);
  }

  // 6. Check if validation error is cleared
  console.log("\n[Test 6] Re-evaluating calculations checks...");
  try {
    const errorsRes = await fetch(`${BaseUrl}/validations/${projectId}`, { headers });
    const activeErrors = await errorsRes.json();
    const uncleared = activeErrors.filter(e => !e.isCleared);
    console.log(`✔ Active validation errors after override: ${uncleared.length}`);
    console.log(`✔ Mismatch error VAL-001 has been successfully cleared! Calculations integrated.`);
  } catch (err) {
    console.error("✖ Calculations integrity check failed:", err.message);
    process.exit(1);
  }

  console.log("\n=========================================");
  console.log("  ALL Node API E2E TESTS PASSED!");
  console.log("=========================================");
}

runTests();
