const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const START_PORT = process.env.API_RBAC_PORT || "3000";
const START_TIMEOUT_MS = 120000;
const REQUEST_TIMEOUT_MS = 15000;

const DEFAULT_CREDENTIALS = {
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@gripper.com",
    password: process.env.ADMIN_PASSWORD || "password123",
  },
};

function parseArgs() {
  return {
    startServer: process.argv.includes("--start"),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse(text) {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch (_) {
    return undefined;
  }
}

async function requestWithTimeout(url, init = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function httpRequest(baseUrl, method, route, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let body;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  const response = await requestWithTimeout(`${baseUrl}${route}`, {
    method,
    headers,
    body,
  });

  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    text,
    json: safeJsonParse(text),
  };
}

async function waitUntilReady(baseUrl, timeoutMs = START_TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await requestWithTimeout(`${baseUrl}/api/docs-json`, { method: "GET" }, 2500);
      if (response.ok) return;
    } catch (_) {
      // keep polling
    }
    await sleep(1000);
  }
  throw new Error(`API did not become ready at ${baseUrl} within ${timeoutMs}ms`);
}

function startServer(port) {
  const child = spawn("pnpm", ["start:dev"], {
    cwd: ROOT,
    detached: true,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[api] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[api] ${chunk}`));
  return child;
}

function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (_) {
    child.kill("SIGTERM");
  }
}

function addResult(results, test, actual, expected, note) {
  const pass = String(actual) === String(expected);
  results.push({ test, actual, expected, pass, note: note || "" });
}

function findPrimaryRole(assignments) {
  const primary = assignments.find((entry) => entry.isPrimary);
  return primary ? primary.role : "";
}

async function runSuite(baseUrl) {
  const results = [];
  const runId = Date.now();

  const adminLogin = await httpRequest(baseUrl, "POST", "/api/auth/login", {
    json: DEFAULT_CREDENTIALS.admin,
  });
  addResult(results, "admin_login", adminLogin.status, 200);
  if (adminLogin.status !== 200 || !adminLogin.json?.accessToken) {
    throw new Error("Cannot continue suite: admin login failed");
  }
  const adminToken = adminLogin.json.accessToken;

  const userEmail = `rbac.user.${runId}@example.com`;
  const providerEmail = `rbac.provider.${runId}@example.com`;
  const bothEmail = `rbac.both.${runId}@example.com`;
  const adminEmail = `rbac.admin.${runId}@example.com`;

  const registerUser = await httpRequest(baseUrl, "POST", "/api/auth/register", {
    json: { email: userEmail, password: "Password123", role: "user" },
  });
  addResult(results, "register_user_status", registerUser.status, 201, `role=${registerUser.json?.user?.role || ""}`);
  addResult(results, "register_user_role", registerUser.json?.user?.role || "", "user");

  const registerProvider = await httpRequest(baseUrl, "POST", "/api/auth/register", {
    json: { email: providerEmail, password: "Password123", role: "provider" },
  });
  addResult(results, "register_provider_status", registerProvider.status, 201, `role=${registerProvider.json?.user?.role || ""}`);
  addResult(results, "register_provider_role", registerProvider.json?.user?.role || "", "provider");

  const registerBoth = await httpRequest(baseUrl, "POST", "/api/auth/register", {
    json: { email: bothEmail, password: "Password123", role: "both" },
  });
  addResult(results, "register_both_status", registerBoth.status, 201, `role=${registerBoth.json?.user?.role || ""}`);
  addResult(results, "register_both_primary_role", registerBoth.json?.user?.role || "", "provider");

  const registerAdmin = await httpRequest(baseUrl, "POST", "/api/auth/register", {
    json: { email: adminEmail, password: "Password123", role: "admin" },
  });
  addResult(results, "register_admin_blocked_status", registerAdmin.status, 400, registerAdmin.json?.message || "");

  const invalidRole = await httpRequest(baseUrl, "POST", "/api/auth/register", {
    json: { email: `rbac.invalid.${runId}@example.com`, password: "Password123", role: "manager" },
  });
  addResult(results, "register_invalid_role_validation", invalidRole.status, 400);

  const weakPassword = await httpRequest(baseUrl, "POST", "/api/auth/register", {
    json: { email: `rbac.weak.${runId}@example.com`, password: "pass", role: "user" },
  });
  addResult(results, "register_weak_password_validation", weakPassword.status, 400);

  const duplicateEmail = await httpRequest(baseUrl, "POST", "/api/auth/register", {
    json: { email: userEmail, password: "Password123", role: "user" },
  });
  addResult(results, "register_duplicate_email", duplicateEmail.status, 409);

  const userToken = registerUser.json?.accessToken;
  const providerToken = registerProvider.json?.accessToken;
  const bothToken = registerBoth.json?.accessToken;
  const userId = registerUser.json?.user?.id;
  const providerId = registerProvider.json?.user?.id;
  const bothId = registerBoth.json?.user?.id;

  const meUser = await httpRequest(baseUrl, "POST", "/api/auth/me", { token: userToken });
  addResult(results, "auth_me_user_status", meUser.status, 200);
  addResult(results, "auth_me_user_role", meUser.json?.role || "", "user");

  const meProvider = await httpRequest(baseUrl, "POST", "/api/auth/me", { token: providerToken });
  addResult(results, "auth_me_provider_status", meProvider.status, 200);
  addResult(results, "auth_me_provider_role", meProvider.json?.role || "", "provider");

  const meBoth = await httpRequest(baseUrl, "POST", "/api/auth/me", { token: bothToken });
  addResult(results, "auth_me_both_status", meBoth.status, 200);
  addResult(results, "auth_me_both_primary_role", meBoth.json?.role || "", "provider");

  const userAssignments = await httpRequest(baseUrl, "GET", `/api/admin/users/${userId}/roles`, {
    token: adminToken,
  });
  const userRoles = (userAssignments.json || []).map((entry) => entry.role).sort().join(",");
  addResult(results, "assignment_user_status", userAssignments.status, 200);
  addResult(results, "assignment_user_roles", userRoles, "user");

  const providerAssignments = await httpRequest(baseUrl, "GET", `/api/admin/users/${providerId}/roles`, {
    token: adminToken,
  });
  const providerRoles = (providerAssignments.json || []).map((entry) => entry.role).sort().join(",");
  addResult(results, "assignment_provider_status", providerAssignments.status, 200);
  addResult(results, "assignment_provider_roles", providerRoles, "provider");

  const bothAssignments = await httpRequest(baseUrl, "GET", `/api/admin/users/${bothId}/roles`, {
    token: adminToken,
  });
  const bothRoles = (bothAssignments.json || []).map((entry) => entry.role).sort().join(",");
  addResult(results, "assignment_both_status", bothAssignments.status, 200);
  addResult(results, "assignment_both_roles", bothRoles, "provider,user");
  addResult(results, "assignment_both_primary", findPrimaryRole(bothAssignments.json || []), "provider");

  const reportBody = {
    targetType: "post",
    targetId: "00000000-0000-4000-8000-000000000abc",
    reason: "spam",
    description: "register-rbac suite",
  };

  const createReportUser = await httpRequest(baseUrl, "POST", "/api/moderation/report", {
    token: userToken,
    json: reportBody,
  });
  addResult(results, "rbac_user_can_create_report", createReportUser.status, 201);

  const createReportProvider = await httpRequest(baseUrl, "POST", "/api/moderation/report", {
    token: providerToken,
    json: reportBody,
  });
  addResult(results, "rbac_provider_can_create_report", createReportProvider.status, 201);

  const createReportBoth = await httpRequest(baseUrl, "POST", "/api/moderation/report", {
    token: bothToken,
    json: reportBody,
  });
  addResult(results, "rbac_both_can_create_report", createReportBoth.status, 201);

  const queueUser = await httpRequest(baseUrl, "GET", "/api/moderation/reports", {
    token: userToken,
  });
  addResult(results, "rbac_user_denied_report_queue", queueUser.status, 403);

  const queueProvider = await httpRequest(baseUrl, "GET", "/api/moderation/reports", {
    token: providerToken,
  });
  addResult(results, "rbac_provider_denied_report_queue", queueProvider.status, 403);

  const queueBoth = await httpRequest(baseUrl, "GET", "/api/moderation/reports", {
    token: bothToken,
  });
  addResult(results, "rbac_both_denied_report_queue", queueBoth.status, 403);

  const matrixUser = await httpRequest(baseUrl, "GET", "/api/admin/permissions/matrix", {
    token: userToken,
  });
  addResult(results, "rbac_user_denied_admin_matrix", matrixUser.status, 403);

  const matrixProvider = await httpRequest(baseUrl, "GET", "/api/admin/permissions/matrix", {
    token: providerToken,
  });
  addResult(results, "rbac_provider_denied_admin_matrix", matrixProvider.status, 403);

  const matrixBoth = await httpRequest(baseUrl, "GET", "/api/admin/permissions/matrix", {
    token: bothToken,
  });
  addResult(results, "rbac_both_denied_admin_matrix", matrixBoth.status, 403);

  const matrixAdmin = await httpRequest(baseUrl, "GET", "/api/admin/permissions/matrix", {
    token: adminToken,
  });
  addResult(results, "rbac_admin_allowed_admin_matrix", matrixAdmin.status, 200);

  const prefUser = await httpRequest(baseUrl, "GET", "/api/preferences", { token: userToken });
  const prefProvider = await httpRequest(baseUrl, "GET", "/api/preferences", { token: providerToken });
  const prefBoth = await httpRequest(baseUrl, "GET", "/api/preferences", { token: bothToken });
  addResult(results, "rbac_user_preferences_access", prefUser.status, 200);
  addResult(results, "rbac_provider_inherits_user_preferences", prefProvider.status, 200);
  addResult(results, "rbac_both_preferences_access", prefBoth.status, 200);

  const providerProfileUser = await httpRequest(baseUrl, "GET", "/api/provider-profiles/me", {
    token: userToken,
  });
  const providerProfileProvider = await httpRequest(baseUrl, "GET", "/api/provider-profiles/me", {
    token: providerToken,
  });
  const providerProfileBoth = await httpRequest(baseUrl, "GET", "/api/provider-profiles/me", {
    token: bothToken,
  });
  addResult(results, "rbac_user_denied_provider_profile", providerProfileUser.status, 403);
  addResult(results, "rbac_provider_provider_profile_access", providerProfileProvider.status, 200);
  addResult(results, "rbac_both_provider_profile_access", providerProfileBoth.status, 200);

  return results;
}

function printReport(results, baseUrl) {
  console.log("\nRegister + RBAC Report");
  console.log("----------------------");
  console.log(`Base URL: ${baseUrl}`);

  const total = results.length;
  const passed = results.filter((entry) => entry.pass).length;
  const failed = total - passed;
  console.log(`Total: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  for (const entry of results) {
    const icon = entry.pass ? "PASS" : "FAIL";
    console.log(
      `- [${icon}] ${entry.test}: actual=${entry.actual} expected=${entry.expected}${entry.note ? ` note=${entry.note}` : ""}`,
    );
  }
}

async function main() {
  const args = parseArgs();
  const targetPort = args.startServer ? START_PORT : new URL(DEFAULT_BASE_URL).port;
  const baseUrl = args.startServer ? `http://127.0.0.1:${targetPort}` : DEFAULT_BASE_URL;

  let server;
  try {
    if (args.startServer) {
      console.log(`Starting API server on port ${targetPort}...`);
      server = startServer(targetPort);
      await waitUntilReady(baseUrl);
    }

    const results = await runSuite(baseUrl);
    printReport(results, baseUrl);

    const failed = results.some((entry) => !entry.pass);
    if (failed) process.exit(1);
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
