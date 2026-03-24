const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const START_PORT = process.env.API_RBAC_PORT || "3000";
const START_TIMEOUT_MS = 120000;
const REQUEST_TIMEOUT_MS = 20000;

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
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

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
      const response = await requestWithTimeout(`${baseUrl}/api/docs-json`, {}, 2500);
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

function addResult(results, test, actual, expected, note = "") {
  const expectedSet = Array.isArray(expected) ? expected : [expected];
  const pass = expectedSet.includes(actual);
  results.push({ test, actual, expected: expectedSet.join("|"), pass, note });
}

async function runSuite(baseUrl) {
  const results = [];
  const runId = Date.now();
  const hasAdminCreds =
    Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.trim()) &&
    Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim());

  const register = await httpRequest(baseUrl, "POST", "/api/auth/register", {
    json: {
      email: `payout.flow.${runId}@example.com`,
      password: "Password123",
      role: "both",
    },
  });
  addResult(results, "register_provider_capable", register.status, 201);

  const providerToken = register.json?.accessToken;
  if (!providerToken) {
    throw new Error("Provider token not returned from register");
  }

  const noAuthVerify = await httpRequest(baseUrl, "POST", "/api/payouts/verify-account", {
    json: {
      gateway: "flutterwave",
      accountNumber: "0123456789",
      bankCode: "044",
    },
  });
  addResult(results, "verify_account_requires_auth", noAuthVerify.status, 401);

  const withAuthVerify = await httpRequest(baseUrl, "POST", "/api/payouts/verify-account", {
    token: providerToken,
    json: {
      gateway: "flutterwave",
      accountNumber: "0123456789",
      bankCode: "044",
    },
  });
  addResult(
    results,
    "verify_account_auth_gate_passed",
    withAuthVerify.status,
    [200, 400, 422, 500],
    "Non-401/403 confirms RBAC pass; 500 expected when FLW creds missing",
  );

  const balance = await httpRequest(baseUrl, "GET", "/api/payouts/balance", {
    token: providerToken,
  });
  addResult(results, "provider_balance_access", balance.status, 200);
  const hasReleasedAmount =
    typeof balance.json?.releasedAmount === "number" ||
    (typeof balance.json?.releasedAmount === "string" && balance.json?.releasedAmount.length > 0);
  addResult(results, "balance_has_released_amount", hasReleasedAmount, true);

  const myReleases = await httpRequest(baseUrl, "GET", "/api/payouts/releases", {
    token: providerToken,
  });
  addResult(results, "provider_release_history_access", myReleases.status, 200);

  const createPayoutNoRelease = await httpRequest(baseUrl, "POST", "/api/payouts", {
    token: providerToken,
    json: {
      amount: 1000,
    },
  });
  addResult(
    results,
    "withdrawal_blocked_without_release",
    createPayoutNoRelease.status,
    400,
  );

  const webhookNoSig = await httpRequest(baseUrl, "POST", "/api/payouts/webhook/flutterwave", {
    json: {
      type: "transfer.completed",
      data: { reference: "PAYOUT-TEST-REF" },
    },
  });
  addResult(results, "flutterwave_webhook_requires_signature", webhookNoSig.status, 401);

  const adminLogin = await httpRequest(baseUrl, "POST", "/api/auth/login", {
    json: {
      email: process.env.ADMIN_EMAIL || "admin@gripper.com",
      password: process.env.ADMIN_PASSWORD || "password123",
    },
  });

  if (adminLogin.status === 200 && adminLogin.json?.accessToken) {
    const adminToken = adminLogin.json.accessToken;
    addResult(results, "admin_login", adminLogin.status, 200);

    const adminListReleases = await httpRequest(baseUrl, "GET", "/api/payouts/releases/admin", {
      token: adminToken,
    });
    addResult(results, "admin_release_history_access", adminListReleases.status, 200);

    const createFakeRelease = await httpRequest(baseUrl, "POST", "/api/payouts/releases/admin", {
      token: adminToken,
      json: {
        providerId: register.json?.user?.id,
        sourceType: "order",
        sourceId: "00000000-0000-4000-8000-000000000002",
        releaseMode: "manual",
        amount: 1000,
        reason: "test release with fake source",
      },
    });
    addResult(
      results,
      "admin_release_validation",
      createFakeRelease.status,
      [400, 404],
      "Expected with fake source id",
    );
  } else {
    if (!hasAdminCreds) {
      addResult(
        results,
        "admin_login",
        adminLogin.status,
        [400, 401],
        "Skipped admin-only flow because ADMIN_EMAIL/ADMIN_PASSWORD were not provided",
      );
    } else {
      addResult(results, "admin_login", adminLogin.status, 200);
    }
  }

  return results;
}

function printReport(results, baseUrl) {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;

  console.log("\nPayout Release + Gateway Report");
  console.log("-------------------------------");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Total: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  for (const result of results) {
    const icon = result.pass ? "PASS" : "FAIL";
    console.log(
      `- [${icon}] ${result.test}: actual=${result.actual} expected=${result.expected}${result.note ? ` note=${result.note}` : ""}`,
    );
  }

  return failed === 0;
}

async function main() {
  const args = parseArgs();
  const baseUrl = args.startServer ? `http://127.0.0.1:${START_PORT}` : DEFAULT_BASE_URL;

  let server;
  try {
    if (args.startServer) {
      console.log(`Starting API server on ${baseUrl} ...`);
      server = startServer(START_PORT);
      await waitUntilReady(baseUrl);
    }

    const results = await runSuite(baseUrl);
    const success = printReport(results, baseUrl);
    if (!success) {
      process.exit(1);
    }
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
