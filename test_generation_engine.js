const BaseUrl = "http://localhost:5000/api";

const headers = (token) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
});

async function runTests() {
  console.log("=================================================");
  console.log("  AI XBRL Studio Phase 5 Verification (E2E)      ");
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
  console.log("\n[Test 2] Querying filing project details...");
  const projectsRes = await fetch(`${BaseUrl}/projects`, {
    headers: headers(token)
  });
  const projects = await projectsRes.json();
  const project = projects[0];
  if (!project) {
    console.error("✖ No filing projects found in scope.");
    process.exit(1);
  }
  const projectId = project.id;
  console.log(`✔ Found Active Project ID: ${projectId}`);

  // 3. Fetch Readiness Gate
  console.log("\n[Test 3] Verifying Generation Readiness Gate...");
  const readinessRes = await fetch(`${BaseUrl}/projects/${projectId}/generation-readiness`, {
    headers: headers(token)
  });
  const readiness = await readinessRes.json();
  console.log(`✔ Project Readiness status: ${readiness.isReady ? 'READY' : 'BLOCKED'}`);

  // 4. Generate Draft XBRL
  console.log("\n[Test 4] Compiling DRAFT XBRL Instance...");
  const draftRes = await fetch(`${BaseUrl}/projects/${projectId}/xbrl/draft`, {
    method: "POST",
    headers: headers(token)
  });
  const draftInstance = await draftRes.json();
  if (!draftInstance.id) {
    console.error("✖ Draft generation failed:", draftInstance);
    process.exit(1);
  }
  console.log(`✔ Draft created successfully! ID: ${draftInstance.id} (Status: ${draftInstance.status})`);
  console.log(`  Filename: ${draftInstance.filename}`);

  // 5. Fetch facts
  console.log("\n[Test 5] Querying serialized XBRL Facts...");
  const factsRes = await fetch(`${BaseUrl}/xbrl/${draftInstance.id}/facts`, {
    headers: headers(token)
  });
  const facts = await factsRes.json();
  console.log(`✔ Retrieved facts count: ${facts.length}`);
  if (facts.length > 0) {
    console.log(`  First Fact: [${facts[0].qname}] -> Value: ${facts[0].value}`);
  }

  // 6. Generate PDF report layout
  console.log("\n[Test 6] Compiling Human-Readable PDF Report...");
  const pdfRes = await fetch(`${BaseUrl}/projects/${projectId}/pdf/preview`, {
    method: "POST",
    headers: headers(token)
  });
  const pdfArtifact = await pdfRes.json();
  if (!pdfArtifact.id) {
    console.error("✖ PDF Generation failed:", pdfArtifact);
    process.exit(1);
  }
  console.log(`✔ PDF compiled successfully! ID: ${pdfArtifact.id}`);
  console.log(`  Filename: ${pdfArtifact.filename}`);
  console.log(`  SHA-256 Hash: ${pdfArtifact.sha256}`);

  // 7. Compile Final Package ZIP
  console.log("\n[Test 7] Compiling final ZIP Filing Package...");
  const packRes = await fetch(`${BaseUrl}/projects/${projectId}/packages`, {
    method: "POST",
    headers: headers(token)
  });
  const pack = await packRes.json();
  if (!pack.id) {
    console.error("✖ ZIP compilation failed:", pack);
    process.exit(1);
  }
  console.log(`✔ ZIP Package built successfully! ID: ${pack.id}`);
  console.log(`  Filename: ${pack.filename}`);
  console.log(`  SHA-256 Hash: ${pack.sha256}`);

  console.log("\n=================================================");
  console.log("  ALL PHASE 5 GENERATION TESTS PASSED CLEANLY!   ");
  console.log("=================================================");
}

runTests().catch(err => {
  console.error("✖ Integration tests crash:", err);
  process.exit(1);
});
