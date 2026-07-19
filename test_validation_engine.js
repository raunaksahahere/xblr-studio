const BaseUrl = "http://localhost:5000/api";
let token = "";
let projectId = "";

const headers = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
});

async function runTests() {
  console.log("=================================================");
  console.log("  AI XBRL Studio Phase 4 Verification (E2E)      ");
  console.log("=================================================");

  // 1. Login
  try {
    console.log("\n[Test 1] Authenticating as Admin...");
    const loginRes = await fetch(`${BaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@xbrlstudio.com",
        password: "AdminSecretPass123"
      })
    });
    const auth = await loginRes.json();
    token = auth.accessToken;
    if (!token) throw new Error("Token missing from response");
    console.log("✔ Login successful! Token acquired.");
  } catch (err) {
    console.error("✖ Authentication failed:", err.message);
    process.exit(1);
  }

  // 2. Find Project
  try {
    console.log("\n[Test 2] Querying filing project details...");
    const projRes = await fetch(`${BaseUrl}/projects`, { headers: headers() });
    const projects = await projRes.json();
    if (!projects || projects.length === 0) {
      throw new Error("No active projects found. Seed or Phase 2 must be run first.");
    }
    projectId = projects[0].id;
    console.log(`✔ Found Active Project ID: ${projectId}`);
  } catch (err) {
    console.error("✖ Project query failed:", err.message);
    process.exit(1);
  }

  // 3. Trigger Validation Run
  let runId = "";
  try {
    console.log("\n[Test 3] Triggering Compliance Validation Run orchestrator...");
    const runRes = await fetch(`${BaseUrl}/projects/${projectId}/validation-runs`, {
      method: "POST",
      headers: headers()
    });
    const run = await runRes.json();
    runId = run.id;
    console.log(`✔ Run created successfully. ID: ${runId} (Status: ${run.status})`);
    if (run.status !== 'SUCCEEDED') {
      throw new Error(`Expected run status to be SUCCEEDED but got ${run.status}`);
    }
  } catch (err) {
    console.error("✖ Validation trigger failed:", err.message);
    process.exit(1);
  }

  // 4. Retrieve Run Results
  try {
    console.log("\n[Test 4] Querying validation results checks details...");
    const resRes = await fetch(`${BaseUrl}/validation-runs/${runId}/results`, { headers: headers() });
    const results = await resRes.json();
    console.log(`✔ Retrieved validations count: ${results.length}`);
    for (const item of results) {
      console.log(`  [${item.ruleCode}] ${item.title} -> Severity: ${item.severity} (Status: ${item.status})`);
    }
  } catch (err) {
    console.error("✖ Querying results failed:", err.message);
    process.exit(1);
  }

  // 5. Verify Readiness Gate
  try {
    console.log("\n[Test 5] Querying Project Readiness Gate locks...");
    const gateRes = await fetch(`${BaseUrl}/projects/${projectId}/readiness`, { headers: headers() });
    const gate = await gateRes.json();
    console.log(`✔ Project Readiness Status: ${gate.isReady ? "APPROVED FOR GENERATION" : "BLOCKED"}`);
    console.log("  Stage Readiness indicators:");
    Object.entries(gate.stages).forEach(([stage, status]) => {
      console.log(`  - ${stage}: ${status}`);
    });
  } catch (err) {
    console.error("✖ Readiness check failed:", err.message);
    process.exit(1);
  }

  console.log("\n=================================================");
  console.log("  ALL PHASE 4 ENGINE TESTS PASSED SUCCESSFULLY!  ");
  console.log("=================================================");
}

runTests();
