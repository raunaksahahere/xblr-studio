const BaseUrl = "http://localhost:5000/api";

const headers = (token) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`
});

async function runTests() {
  console.log("=================================================");
  console.log("  AI XBRL Studio Tenant Isolation Verification   ");
  console.log("=================================================");

  // 1. Authenticate Tenant A (Seeded Admin)
  console.log("\n[Step 1] Authenticating Tenant A (Admin)...");
  const loginARes = await fetch(`${BaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@xbrlstudio.com", password: "AdminSecretPass123" })
  });

  if (!loginARes.ok) {
    console.error("✖ Tenant A authentication failed!");
    process.exit(1);
  }
  const { accessToken: tokenA } = await loginARes.json();
  console.log("✔ Tenant A authenticated successfully.");

  // 2. Register and Authenticate Tenant B (Attacker)
  console.log("\n[Step 2] Registering Tenant B (Attacker)...");
  const randomEmail = `attacker-${Date.now()}@evilorg.com`;
  const registerBRes = await fetch(`${BaseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: randomEmail,
      password: "AttackerPass123!",
      name: "Attacker User",
      organizationName: "Evil Organization Corp"
    })
  });

  if (!registerBRes.ok) {
    console.error("✖ Tenant B registration failed!");
    process.exit(1);
  }
  console.log("✔ Tenant B registered successfully. Authenticating...");

  const loginBRes = await fetch(`${BaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: randomEmail, password: "AttackerPass123!" })
  });

  if (!loginBRes.ok) {
    console.error("✖ Tenant B authentication failed!");
    process.exit(1);
  }
  const { accessToken: tokenB } = await loginBRes.json();
  console.log("✔ Tenant B authenticated successfully.");

  // 3. Fetch Tenant A's Project ID
  console.log("\n[Step 3] Fetching Tenant A's private project details...");
  const projectsRes = await fetch(`${BaseUrl}/projects`, {
    headers: headers(tokenA)
  });
  const projects = await projectsRes.json();
  const projectA = projects[0];
  if (!projectA) {
    console.error("✖ No projects found for Tenant A. Check database seeds.");
    process.exit(1);
  }
  const projectAId = projectA.id;
  const companyAId = projectA.companyId;
  console.log(`✔ Found Tenant A Project ID: ${projectAId}`);
  console.log(`✔ Found Tenant A Company ID: ${companyAId}`);

  // 4. Attack Test: Tenant B attempts to read Tenant A's Project Details
  console.log("\n[Step 4] Attack Test: Tenant B reads Tenant A's project...");
  const readRes = await fetch(`${BaseUrl}/projects/${projectAId}`, {
    headers: headers(tokenB)
  });
  console.log(`  Response Status: ${readRes.status} (${readRes.statusText})`);
  if (readRes.status !== 403) {
    console.error("✖ FAIL: Tenant B was not denied access to Tenant A's project!");
    process.exit(1);
  }
  console.log("✔ SUCCESS: Access denied with 403.");

  // 5. Attack Test: Tenant B attempts to update Tenant A's Project Status
  console.log("\n[Step 5] Attack Test: Tenant B updates Tenant A's project status...");
  const updateRes = await fetch(`${BaseUrl}/projects/${projectAId}/status`, {
    method: "PUT",
    headers: headers(tokenB),
    body: JSON.stringify({ status: "COMPLETED" })
  });
  console.log(`  Response Status: ${updateRes.status} (${updateRes.statusText})`);
  if (updateRes.status !== 403) {
    console.error("✖ FAIL: Tenant B was allowed to modify Tenant A's project status!");
    process.exit(1);
  }
  console.log("✔ SUCCESS: Access denied with 403.");

  // 6. Attack Test: Tenant B attempts to access Tenant A's Company Master details
  console.log("\n[Step 6] Attack Test: Tenant B reads Tenant A's company details...");
  const readCompanyRes = await fetch(`${BaseUrl}/companies/${companyAId}/history`, {
    headers: headers(tokenB)
  });
  console.log(`  Response Status: ${readCompanyRes.status} (${readCompanyRes.statusText})`);
  if (readCompanyRes.status !== 403) {
    console.error("✖ FAIL: Tenant B was allowed to fetch Tenant A's company history!");
    process.exit(1);
  }
  console.log("✔ SUCCESS: Access denied with 403.");

  console.log("\n=================================================");
  console.log("  ALL TENANT ISOLATION TESTS PASSED SUCCESSFULLY! ");
  console.log("=================================================");
}

runTests().catch(console.error);
