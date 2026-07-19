const BaseUrl = "http://localhost:5000/api";

const runTests = async () => {
  console.log("=================================================");
  console.log("  AI XBRL Studio Phase 2 Verification (E2E)      ");
  console.log("=================================================\n");

  let token = "";
  let projectId = "";
  let documentId = "";
  let companyId = "";

  const headers = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  });

  // 1. Authenticate
  try {
    console.log("[Test 1] Authenticating as Admin...");
    const res = await fetch(`${BaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@xbrlstudio.com",
        password: "AdminSecretPass123"
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    token = data.accessToken;
    console.log(`✔ Login successful! Token acquired.`);
  } catch (err) {
    console.error("✖ Authentication failed:", err.message);
    process.exit(1);
  }

  // 2. Query or Create Project
  try {
    console.log("\n[Test 2] Querying or Creating Filing Project...");
    const compRes = await fetch(`${BaseUrl}/companies`, { headers: headers() });
    const companies = await compRes.json();
    const reliance = companies.find(c => c.cin === "L17110MH1973PLC019786");

    if (!reliance) throw new Error("Company Reliance Industries seed not found");
    companyId = reliance.id;

    // Create Project
    const projRes = await fetch(`${BaseUrl}/projects`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        companyId: reliance.id,
        financialYear: "2024-2025"
      })
    });
    const projData = await projRes.json();
    
    if (projRes.status === 409) {
      projectId = projData.project.id;
      console.log(`✔ Reusing existing Project ID: ${projectId}`);
    } else if (projRes.ok) {
      projectId = projData.id;
      console.log(`✔ Created fresh Project ID: ${projectId}`);
    } else {
      throw new Error(projData.error);
    }
  } catch (err) {
    console.error("✖ Project initialization failed:", err.message);
    process.exit(1);
  }

  // 3. Register a Document to Run the Pipeline
  try {
    console.log("\n[Test 3] Uploading financial statement document...");
    
    const docRes = await fetch(`${BaseUrl}/documents`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: (() => {
        const formData = new FormData();
        const blob = new Blob(["Total Assets: 10,000,000 Total Shareholders Equity: 6,000,000 Total Liabilities: 4,500,000 Revenue from Operations: 15,000,000 Profit for Period: 2,500,000"], { type: "text/plain" });
        formData.append("file", blob, "reliance_report_lakhs.pdf");
        formData.append("projectId", projectId);
        formData.append("companyId", companyId);
        formData.append("financialYear", "2024-2025");
        formData.append("periodScope", "CURRENT");
        return formData;
      })()
    });

    const docData = await docRes.json();
    if (!docRes.ok) {
      if (docRes.status === 409 && docData.error?.code === "DUPLICATE_DETECTED") {
        documentId = docData.error.duplicateDocumentId;
        console.log(`✔ Duplicate detected. Reusing existing Document ID: ${documentId}`);
      } else {
        throw new Error(docData.error?.message || "Failed to register document");
      }
    } else {
      documentId = docData.document.id;
      console.log(`✔ Upload successful! Document ID: ${documentId}`);
    }
  } catch (err) {
    console.error("✖ Document registration failed:", err.message);
    process.exit(1);
  }

  // 4. Trigger Pipeline Run
  try {
    console.log("\n[Test 4] Triggering Financial Intelligence Engine run...");
    const runRes = await fetch(`${BaseUrl}/projects/${projectId}/financial-intelligence/run`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ documentId })
    });
    const runData = await runRes.json();
    if (!runRes.ok) throw new Error(runData.error);

    console.log(`✔ Pipeline run triggered successfully: "${runData.message}"`);
  } catch (err) {
    console.error("✖ Pipeline execution failed:", err.message);
    process.exit(1);
  }

  // 5. Verify Extracted Facts & Reconciliations
  let factIdToOverride = "";
  try {
    console.log("\n[Test 5] Verifying parsed facts, scale normalizations, and notes link...");
    const factsRes = await fetch(`${BaseUrl}/projects/${projectId}/facts`, { headers: headers() });
    const facts = await factsRes.json();

    console.log(`✔ Mapped facts count: ${facts.length}`);
    for (const f of facts) {
      console.log(`  Fact: ${f.factKey} = ${f.factValue} (${f.scale} scale) -> Normalized: ${f.valueNormalized} INR [Note: ${f.noteReference || 'none'}]`);
      if (f.factKey === "Liabilities" && f.sourceDocumentId === documentId) {
        factIdToOverride = f.id;
      }
    }

    const recsRes = await fetch(`${BaseUrl}/projects/${projectId}/reconciliations`, { headers: headers() });
    const recs = await recsRes.json();
    console.log(`✔ Active validation exceptions count: ${recs.length}`);
    for (const r of recs) {
      console.log(`  Exception [${r.errorCode}] (${r.severity}): ${r.message}`);
    }

    const hasMismatch = recs.some(r => r.errorCode === "VAL-001");
    if (!hasMismatch) throw new Error("Expected Balance Sheet mismatch exception (VAL-001) not found");
  } catch (err) {
    console.error("✖ Verification checks failed:", err.message);
    process.exit(1);
  }

  // 6. Apply Reviewer Override
  try {
    console.log("\n[Test 6] Overriding Liabilities fact value to clear BS mismatch...");
    const overrideRes = await fetch(`${BaseUrl}/facts/${factIdToOverride}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        isOverridden: true,
        overriddenValue: "4000000",
        comment: "Reclassified vendor deposits into long-term provision groups."
      })
    });
    const overData = await overrideRes.json();
    if (!overrideRes.ok) throw new Error(overData.error);

    console.log(`✔ Override applied successfully. New Liabilities value: ${overData.overriddenValue}`);
  } catch (err) {
    console.error("✖ Manual override failed:", err.message);
    process.exit(1);
  }

  // 7. Re-evaluate Reconciliations
  try {
    console.log("\n[Test 7] Checking validations after override...");
    const recsRes = await fetch(`${BaseUrl}/projects/${projectId}/reconciliations`, { headers: headers() });
    const recs = await recsRes.json();

    // Check if there is still a VAL-001 error for this specific overridden statement
    const hasMismatch = recs.some(r => r.errorCode === "VAL-001" && r.message.includes(factIdToOverride));
    if (hasMismatch) throw new Error("Balance Sheet mismatch VAL-001 is still active for statement!");

    console.log(`✔ Validation mismatch VAL-001 was successfully resolved and cleared!`);
  } catch (err) {
    console.error("✖ Reevaluation verification failed:", err.message);
    process.exit(1);
  }

  // 8. Rebuild and Approve Release Dataset Version Snapshots
  try {
    console.log("\n[Test 8] Compiling and approving Financial Dataset version snapshot...");
    const buildRes = await fetch(`${BaseUrl}/projects/${projectId}/financial-datasets/build`, {
      method: "POST",
      headers: headers()
    });
    const dataset = await buildRes.json();
    if (!buildRes.ok) throw new Error(dataset.error);

    console.log(`✔ Compiled snapshot version: v${dataset.versionNumber} [Hash: ${dataset.factSnapshotHash}]`);

    const approveRes = await fetch(`${BaseUrl}/financial-datasets/${dataset.id}/approve`, {
      method: "POST",
      headers: headers()
    });
    const approved = await approveRes.json();
    if (!approveRes.ok) throw new Error(approved.error);

    console.log(`✔ Snapshot snapshot status: ${approved.status} by ${approved.approvedBy}`);
  } catch (err) {
    console.error("✖ Snapshot version compilation failed:", err.message);
    process.exit(1);
  }

  console.log("\n=================================================");
  console.log("  ALL PHASE 2 ENGINE TESTS PASSED SUCCESSFULLY!  ");
  console.log("=================================================");
};

runTests();
