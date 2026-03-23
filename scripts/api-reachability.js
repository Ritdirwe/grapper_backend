const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SWAGGER_PATH = path.join(ROOT, "swagger.json");

const DEFAULT_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3101";
const START_PORT = process.env.API_SMOKE_PORT || "3101";
const START_TIMEOUT_MS = 120000;
const REQUEST_TIMEOUT_MS = 10000;
const CONCURRENCY = 8;

const DEFAULT_CREDENTIALS = {
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@grapper.com",
    password: process.env.ADMIN_PASSWORD || "password123",
  },
  provider: {
    email: process.env.PROVIDER_EMAIL || "sarah@grapper.com",
    password: process.env.PROVIDER_PASSWORD || "password123",
  },
  user: {
    email: process.env.USER_EMAIL || "john@example.com",
    password: process.env.USER_PASSWORD || "password123",
  },
};

const SAMPLE_VALUES = {
  id: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
  postId: "00000000-0000-4000-8000-000000000003",
  commentId: "00000000-0000-4000-8000-000000000004",
  milestoneId: "00000000-0000-4000-8000-000000000005",
  imageId: "00000000-0000-4000-8000-000000000006",
  index: "0",
  type: "post",
  action: "approve",
  reference: "ref_test_001",
  slug: "sample-slug",
  tag: "sample-tag",
};

function parseArgs() {
  return {
    startServer: process.argv.includes("--start"),
  };
}

function readSwagger() {
  if (!fs.existsSync(SWAGGER_PATH)) {
    throw new Error(
      `swagger.json not found at ${SWAGGER_PATH}. Start the app once to generate it.`,
    );
  }

  return JSON.parse(fs.readFileSync(SWAGGER_PATH, "utf8"));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithTimeout(
  url,
  init = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitUntilReady(baseUrl, timeoutMs = START_TIMEOUT_MS) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await requestWithTimeout(
        `${baseUrl}/api/docs-json`,
        { method: "GET" },
        2500,
      );
      if (response.ok) {
        return;
      }
    } catch (_) {
      // Keep polling until timeout.
    }

    await sleep(1000);
  }

  throw new Error(
    `API did not become ready within ${timeoutMs}ms at ${baseUrl}`,
  );
}

function startServer(port) {
  const child = spawn("pnpm", ["start"], {
    cwd: ROOT,
    detached: true,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[api] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[api] ${chunk}`);
  });

  return child;
}

function stopServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (_) {
    child.kill("SIGTERM");
  }
}

function buildUrl(baseUrl, rawPath) {
  const replaced = rawPath.replace(/\{([^}]+)\}/g, (_, paramName) => {
    return SAMPLE_VALUES[paramName] || SAMPLE_VALUES.id;
  });
  return `${baseUrl}${replaced}`;
}

function needsAuth(operation) {
  return Array.isArray(operation.security) && operation.security.length > 0;
}

async function loginAndGetToken(baseUrl, email, password) {
  const response = await requestWithTimeout(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${email} with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.accessToken) {
    throw new Error(
      `Login succeeded for ${email} but no accessToken was returned`,
    );
  }

  return payload.accessToken;
}

async function resolveTokens(baseUrl) {
  const tokens = {
    admin: process.env.ADMIN_TOKEN,
    provider: process.env.PROVIDER_TOKEN,
    user: process.env.USER_TOKEN,
  };

  if (!tokens.admin) {
    tokens.admin = await loginAndGetToken(
      baseUrl,
      DEFAULT_CREDENTIALS.admin.email,
      DEFAULT_CREDENTIALS.admin.password,
    );
  }

  if (!tokens.provider) {
    tokens.provider = await loginAndGetToken(
      baseUrl,
      DEFAULT_CREDENTIALS.provider.email,
      DEFAULT_CREDENTIALS.provider.password,
    );
  }

  if (!tokens.user) {
    tokens.user = await loginAndGetToken(
      baseUrl,
      DEFAULT_CREDENTIALS.user.email,
      DEFAULT_CREDENTIALS.user.password,
    );
  }

  return tokens;
}

function pickToken(pathName, operation, tokens) {
  if (!needsAuth(operation)) {
    return undefined;
  }

  if (pathName.includes("/admin/") || pathName.includes("/moderation")) {
    return tokens.admin;
  }

  if (pathName.includes("/provider") || pathName.includes("/payouts")) {
    return tokens.provider || tokens.user;
  }

  return tokens.user;
}

function buildRequestInit(pathName, method, operation, tokens) {
  const upperMethod = method.toUpperCase();
  const init = { method: upperMethod, headers: {} };

  const token = pickToken(pathName, operation, tokens);
  if (token) {
    init.headers.Authorization = `Bearer ${token}`;
  }

  if (operation.requestBody && ["POST", "PUT", "PATCH"].includes(upperMethod)) {
    const content = operation.requestBody.content || {};
    if (content["application/json"]) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify({});
    } else if (content["application/x-www-form-urlencoded"]) {
      init.headers["Content-Type"] = "application/x-www-form-urlencoded";
      init.body = "";
    } else if (content["multipart/form-data"]) {
      return {
        skipped: true,
        reason: "multipart/form-data skipped in pass A",
      };
    }
  }

  return { init };
}

function enumerateOperations(swagger) {
  const entries = [];
  const paths = swagger.paths || {};

  for (const [pathName, operations] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(operations)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) {
        continue;
      }

      entries.push({ pathName, method, operation });
    }
  }

  return entries;
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = [];
  let index = 0;

  async function runOne() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runOne(),
  );
  await Promise.all(workers);
  return results;
}

async function runPassA(baseUrl, swagger, tokens) {
  const operations = enumerateOperations(swagger);
  const startedAt = new Date().toISOString();

  const results = await runWithConcurrency(
    operations,
    CONCURRENCY,
    async ({ pathName, method, operation }) => {
      const request = buildRequestInit(pathName, method, operation, tokens);
      if (request.skipped) {
        return {
          path: pathName,
          method: method.toUpperCase(),
          status: "SKIPPED",
          ok: true,
          reason: request.reason,
        };
      }

      const url = buildUrl(baseUrl, pathName);

      try {
        const response = await requestWithTimeout(url, request.init);
        const ok = response.status < 500;
        return {
          path: pathName,
          method: method.toUpperCase(),
          status: response.status,
          ok,
        };
      } catch (error) {
        return {
          path: pathName,
          method: method.toUpperCase(),
          status: "ERROR",
          ok: false,
          reason: error.message,
        };
      }
    },
  );

  const failed = results.filter((r) => !r.ok);
  const skipped = results.filter((r) => r.status === "SKIPPED");

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    skipped: skipped.length,
  };

  return {
    summary,
    failed,
  };
}

function printSummary(report) {
  console.log("\nPass A Reachability Report");
  console.log("--------------------------");
  console.log(`Base URL: ${report.summary.baseUrl}`);
  console.log(`Total operations: ${report.summary.total}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Skipped: ${report.summary.skipped}`);

  if (report.failed.length > 0) {
    console.log("\nFailures (5xx/network):");
    for (const fail of report.failed.slice(0, 30)) {
      console.log(
        `- ${fail.method} ${fail.path} -> ${fail.status}${fail.reason ? ` (${fail.reason})` : ""}`,
      );
    }
  }
}

async function main() {
  const args = parseArgs();
  const targetPort = args.startServer
    ? START_PORT
    : new URL(DEFAULT_BASE_URL).port;
  const baseUrl = args.startServer
    ? `http://127.0.0.1:${targetPort}`
    : DEFAULT_BASE_URL;

  const swagger = readSwagger();
  let server;

  try {
    if (args.startServer) {
      console.log(`Starting API server on port ${targetPort}...`);
      server = startServer(targetPort);
      await waitUntilReady(baseUrl);
    }

    const tokens = await resolveTokens(baseUrl);
    const report = await runPassA(baseUrl, swagger, tokens);
    printSummary(report);

    if (report.summary.failed > 0) {
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
