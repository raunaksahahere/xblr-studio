const BaseUrl = "http://localhost:5000/api";

const headers = (token) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
});

async function runTests() {
  console.log("=================================================");
  console.log("  AI XBRL Studio Phase 6 Verification (E2E)      ");
  console.log("=================================================");

  // 1. Login as Admin
  console.log("\n[Test 1] Authenticating as Admin...");
  const loginRes = await fetch(`${BaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@xbrlstudio.com", password: "AdminSecretPass123" })
  });

  if (!loginRes.ok) {
    console.error("✖ Authentication failed!");
    process.exit(1);
  }
  const { accessToken: token } = await loginRes.json();
  console.log("✔ Login successful! Token acquired.");

  // 2. Fetch Projects
  console.log("\n[Test 2] Querying active project details...");
  const projectsRes = await fetch(`${BaseUrl}/projects`, {
    headers: headers(token)
  });
  const projects = await projectsRes.json();
  const project = projects[0];
  if (!project) {
    console.error("✖ No active project found in scope.");
    process.exit(1);
  }
  const projectId = project.id;
  const companyId = project.companyId;
  console.log(`✔ Found Active Project ID: ${projectId}`);
  console.log(`✔ Found Company ID: ${companyId}`);

  // 3. Retrieve Company Memory
  console.log("\n[Test 3] Loading persistent Company Memory...");
  const memoryRes = await fetch(`${BaseUrl}/companies/${companyId}/memory`, {
    headers: headers(token)
  });
  if (!memoryRes.ok) {
    console.error("✖ Failed to retrieve company memory.");
    process.exit(1);
  }
  const memory = await memoryRes.json();
  console.log(`✔ Company Memory loaded! Records count: ${memory.length}`);

  // 4. Retrieve Memory Conflicts
  console.log("\n[Test 4] Checking for Memory Conflicts...");
  const conflictsRes = await fetch(`${BaseUrl}/companies/${companyId}/memory/conflicts`, {
    headers: headers(token)
  });
  if (!conflictsRes.ok) {
    console.error("✖ Failed to retrieve memory conflicts.");
    process.exit(1);
  }
  const conflicts = await conflictsRes.json();
  console.log(`✔ Conflict check completed. Active conflicts count: ${conflicts.length}`);

  // 5. Query Knowledge Graph Neighborhood
  console.log("\n[Test 5] Querying Knowledge Graph Neighborhood...");
  const graphRes = await fetch(`${BaseUrl}/graph/neighborhood?companyId=${companyId}`, {
    headers: headers(token)
  });
  if (!graphRes.ok) {
    console.error("✖ Failed to load graph neighborhood.");
    process.exit(1);
  }
  const graph = await graphRes.json();
  console.log(`✔ Graph loaded! Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);

  // 6. Trigger Arithmetic Reconciliation
  console.log("\n[Test 6] Running Deterministic Reconciliations...");
  const reconcileRes = await fetch(`${BaseUrl}/projects/${projectId}/reconcile`, {
    method: "POST",
    headers: headers(token)
  });
  if (!reconcileRes.ok) {
    console.error("✖ Reconciliation run failed.");
    process.exit(1);
  }
  const reconcile = await reconcileRes.json();
  console.log(`✔ Reconciliations finished! Status: ${reconcile.status}, Balance Sheet Difference: ${reconcile.difference} INR`);

  // 7. Query Reviewer Copilot Chat
  console.log("\n[Test 7] Prompting Reviewer Copilot...");
  const copilotRes = await fetch(`${BaseUrl}/copilot/chat-session`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      projectId,
      message: "Explain Trade Payables mapping and run reconciliation checks",
      mode: "RECONCILE"
    })
  });
  if (!copilotRes.ok) {
    console.error("✖ Copilot session failed.");
    process.exit(1);
  }
  const copilot = await copilotRes.json();
  console.log(`✔ Copilot responded: "${copilot.conclusion}"`);
  console.log(`  Citations Count: ${copilot.citations.length}`);

  console.log("\n=================================================");
  console.log("  ALL PHASE 6 VERIFICATION CHECKS PASSED!        ");
  console.log("=================================================");
}

runTests().catch(console.error);
