const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const TOKEN_CACHE_PATH =
  process.env.API_TOKEN_CACHE_PATH || path.join(ROOT, ".api-token-cache.json");
const TOKEN_EXPIRY_SKEW_SECONDS = Number(
  process.env.API_TOKEN_EXPIRY_SKEW_SECONDS || "120",
);

const DEFAULT_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3101";
const START_PORT = process.env.API_SMOKE_PORT || "3101";
const START_TIMEOUT_MS = 120000;
const REQUEST_TIMEOUT_MS = 15000;

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

function parseJwtExp(token) {
  if (!token || typeof token !== "string") {
    return undefined;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return undefined;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp : undefined;
  } catch (_) {
    return undefined;
  }
}

function isTokenFresh(token) {
  if (!token) {
    return false;
  }

  const exp = parseJwtExp(token);
  if (!exp) {
    return true;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp > nowSeconds + TOKEN_EXPIRY_SKEW_SECONDS;
}

function readTokenCache() {
  if (!fs.existsSync(TOKEN_CACHE_PATH)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, "utf8"));
  } catch (_) {
    return {};
  }
}

function writeTokenCache(cache) {
  const dir = path.dirname(TOKEN_CACHE_PATH);
  const tmpFile = `${TOKEN_CACHE_PATH}.tmp`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(tmpFile, `${JSON.stringify(cache, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.renameSync(tmpFile, TOKEN_CACHE_PATH);
}

function loadCachedTokens(baseUrl) {
  const cache = readTokenCache();
  const scoped = cache[baseUrl] || {};

  return {
    admin: isTokenFresh(scoped.admin?.token) ? scoped.admin.token : undefined,
    provider: isTokenFresh(scoped.provider?.token)
      ? scoped.provider.token
      : undefined,
    user: isTokenFresh(scoped.user?.token) ? scoped.user.token : undefined,
  };
}

function persistTokens(baseUrl, tokens) {
  const cache = readTokenCache();
  const scoped = cache[baseUrl] || {};
  const nowIso = new Date().toISOString();

  for (const role of ["admin", "provider", "user"]) {
    const token = tokens[role];
    if (!token) {
      continue;
    }

    scoped[role] = {
      token,
      savedAt: nowIso,
      exp: parseJwtExp(token) || null,
    };
  }

  cache[baseUrl] = scoped;
  writeTokenCache(cache);
}

function parseArgs() {
  return {
    startServer: process.argv.includes("--start"),
  };
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
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
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
      // keep polling
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

function safeJsonParse(text) {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    return undefined;
  }
}

async function httpRequest(baseUrl, method, route, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let body;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.formData) {
    body = options.formData;
  }

  const response = await requestWithTimeout(`${baseUrl}${route}`, {
    method,
    headers,
    body,
  });

  const text = await response.text();
  const json = safeJsonParse(text);

  return {
    status: response.status,
    ok: response.ok,
    json,
    text,
  };
}

function statusIs(...allowed) {
  return (response) => allowed.includes(response.status);
}

function statusUnder500(response) {
  return response.status < 500;
}

function getErrorContext(response) {
  if (!response) {
    return "no response";
  }

  if (response.json) {
    return JSON.stringify(response.json);
  }

  return response.text || "(empty response body)";
}

async function runStep(report, step) {
  const start = Date.now();

  try {
    const response = await step.action();
    const pass = step.expect(response);

    const entry = {
      flow: step.flow,
      name: step.name,
      method: step.method,
      route: step.route,
      status: response.status,
      pass,
      durationMs: Date.now() - start,
      note: step.note,
      error: pass
        ? undefined
        : `Unexpected response: ${getErrorContext(response)}`,
    };

    report.steps.push(entry);

    if (!pass) {
      throw new Error(
        `${step.method} ${step.route} failed with status ${response.status}`,
      );
    }

    return response;
  } catch (error) {
    if (
      !report.steps[report.steps.length - 1] ||
      report.steps[report.steps.length - 1].name !== step.name
    ) {
      report.steps.push({
        flow: step.flow,
        name: step.name,
        method: step.method,
        route: step.route,
        status: "ERROR",
        pass: false,
        durationMs: Date.now() - start,
        note: step.note,
        error: error.message,
      });
    }

    throw error;
  }
}

async function login(baseUrl, email, password) {
  const response = await httpRequest(baseUrl, "POST", "/api/auth/login", {
    json: { email, password },
  });

  if (response.status !== 200 || !response.json?.accessToken) {
    throw new Error(`Login failed for ${email} with status ${response.status}`);
  }

  return {
    token: response.json.accessToken,
    user: response.json.user,
  };
}

async function resolveTokens(baseUrl) {
  const cachedTokens = loadCachedTokens(baseUrl);
  const tokens = {
    admin: isTokenFresh(process.env.ADMIN_TOKEN)
      ? process.env.ADMIN_TOKEN
      : cachedTokens.admin,
    provider: isTokenFresh(process.env.PROVIDER_TOKEN)
      ? process.env.PROVIDER_TOKEN
      : cachedTokens.provider,
    user: isTokenFresh(process.env.USER_TOKEN)
      ? process.env.USER_TOKEN
      : cachedTokens.user,
  };

  if (!tokens.admin) {
    const auth = await login(
      baseUrl,
      DEFAULT_CREDENTIALS.admin.email,
      DEFAULT_CREDENTIALS.admin.password,
    );
    tokens.admin = auth.token;
  }

  if (!tokens.provider) {
    const auth = await login(
      baseUrl,
      DEFAULT_CREDENTIALS.provider.email,
      DEFAULT_CREDENTIALS.provider.password,
    );
    tokens.provider = auth.token;
  }

  if (!tokens.user) {
    const auth = await login(
      baseUrl,
      DEFAULT_CREDENTIALS.user.email,
      DEFAULT_CREDENTIALS.user.password,
    );
    tokens.user = auth.token;
  }

  persistTokens(baseUrl, tokens);
  return tokens;
}

async function runIdentityFlow(baseUrl, report, context) {
  const flow = "Identity";

  await runStep(report, {
    flow,
    name: "admin /auth/me",
    method: "POST",
    route: "/api/auth/me",
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "POST", "/api/auth/me", {
        token: context.adminToken,
      }),
  });

  await runStep(report, {
    flow,
    name: "provider /auth/me",
    method: "POST",
    route: "/api/auth/me",
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "POST", "/api/auth/me", {
        token: context.providerToken,
      }),
  });

  await runStep(report, {
    flow,
    name: "user /auth/me",
    method: "POST",
    route: "/api/auth/me",
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "POST", "/api/auth/me", {
        token: context.userToken,
      }),
  });
}

async function runProfileAndPreferencesFlow(baseUrl, report, context) {
  const flow = "Profile+Preferences";

  await runStep(report, {
    flow,
    name: "get my profile",
    method: "GET",
    route: "/api/profiles/me",
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "GET", "/api/profiles/me", {
        token: context.userToken,
      }),
  });

  await runStep(report, {
    flow,
    name: "get preferences",
    method: "GET",
    route: "/api/preferences",
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "GET", "/api/preferences", {
        token: context.userToken,
      }),
  });

  await runStep(report, {
    flow,
    name: "update preferences",
    method: "PUT",
    route: "/api/preferences",
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "PUT", "/api/preferences", {
        token: context.userToken,
        json: {
          language: "en",
          timezone: "UTC",
          currency: "USD",
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          marketingEmails: false,
          showOnlineStatus: true,
          showProfileToSearch: true,
          allowMessagesFromAnyone: true,
        },
      }),
  });
}

async function runSocialFlow(baseUrl, report, context) {
  const flow = "Social";
  const runId = `passb-${Date.now()}`;

  const form = new FormData();
  form.append("content", `Pass B social flow ${runId}`);
  form.append("visibility", "public");

  const createPost = await runStep(report, {
    flow,
    name: "create post",
    method: "POST",
    route: "/api/posts",
    expect: statusIs(201),
    action: () =>
      httpRequest(baseUrl, "POST", "/api/posts", {
        token: context.userToken,
        formData: form,
      }),
  });

  const postId = createPost.json?.id;
  if (!postId) {
    throw new Error("Post created but no id returned");
  }
  context.postId = postId;

  await runStep(report, {
    flow,
    name: "like post",
    method: "POST",
    route: `/api/posts/${postId}/like`,
    expect: statusIs(201),
    action: () =>
      httpRequest(baseUrl, "POST", `/api/posts/${postId}/like`, {
        token: context.userToken,
        json: {},
      }),
  });

  await runStep(report, {
    flow,
    name: "comment post",
    method: "POST",
    route: `/api/posts/${postId}/comments`,
    expect: statusIs(201),
    action: () =>
      httpRequest(baseUrl, "POST", `/api/posts/${postId}/comments`, {
        token: context.providerToken,
        json: { content: `Pass B comment ${runId}` },
      }),
  });

  await runStep(report, {
    flow,
    name: "share post",
    method: "POST",
    route: `/api/posts/${postId}/share`,
    expect: statusIs(201),
    action: () =>
      httpRequest(baseUrl, "POST", `/api/posts/${postId}/share`, {
        token: context.providerToken,
        json: { caption: `Pass B share ${runId}` },
      }),
  });

  await runStep(report, {
    flow,
    name: "get post comments",
    method: "GET",
    route: `/api/posts/${postId}/comments`,
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "GET", `/api/posts/${postId}/comments`, {
        token: context.userToken,
      }),
  });

  await runStep(report, {
    flow,
    name: "get post shares",
    method: "GET",
    route: `/api/posts/${postId}/shares`,
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "GET", `/api/posts/${postId}/shares`, {
        token: context.userToken,
      }),
  });

  await runStep(report, {
    flow,
    name: "delete post cleanup",
    method: "DELETE",
    route: `/api/posts/${postId}`,
    expect: statusIs(204),
    action: () =>
      httpRequest(baseUrl, "DELETE", `/api/posts/${postId}`, {
        token: context.userToken,
      }),
  });
}

async function runMarketplaceFlow(baseUrl, report, context) {
  const flow = "Marketplace";
  const runId = `passb-${Date.now()}`;

  const categories = await runStep(report, {
    flow,
    name: "list categories",
    method: "GET",
    route: "/api/categories",
    expect: statusIs(200),
    action: () => httpRequest(baseUrl, "GET", "/api/categories"),
  });

  const firstCategory = Array.isArray(categories.json)
    ? categories.json.find((c) => c && c.id)
    : undefined;
  if (!firstCategory) {
    throw new Error("No category available for service creation");
  }

  const createService = await runStep(report, {
    flow,
    name: "create service",
    method: "POST",
    route: "/api/services",
    expect: statusIs(201),
    action: () =>
      httpRequest(baseUrl, "POST", "/api/services", {
        token: context.providerToken,
        json: {
          title: `Pass B Service ${runId}`,
          description:
            "This is a deterministic pass B service creation payload used for end-to-end API flow validation in CI and local checks.",
          shortDescription: "Deterministic pass B service payload",
          categoryId: firstCategory.id,
          price: 150,
          currency: "USD",
          pricingType: "fixed",
          deliveryType: "remote",
          durationDays: 3,
          tags: ["pass-b", "automation"],
          features: ["Flow-safe creation", "Deterministic payload"],
          requirements: ["None"],
          location: "Remote",
          serviceArea: ["Worldwide"],
        },
      }),
  });

  const serviceId = createService.json?.id;
  if (!serviceId) {
    throw new Error("Service created but no id returned");
  }
  context.serviceId = serviceId;

  await runStep(report, {
    flow,
    name: "publish service",
    method: "POST",
    route: `/api/services/${serviceId}/publish`,
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "POST", `/api/services/${serviceId}/publish`, {
        token: context.providerToken,
      }),
  });

  const createBooking = await runStep(report, {
    flow,
    name: "create booking",
    method: "POST",
    route: "/api/bookings",
    expect: statusIs(201),
    action: () =>
      httpRequest(baseUrl, "POST", "/api/bookings", {
        token: context.userToken,
        json: {
          serviceId,
          scheduledDate: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          scheduledTime: "10:00 AM",
          notes: "Pass B booking flow validation",
          location: "Remote",
        },
      }),
  });

  const bookingId = createBooking.json?.id;
  if (!bookingId) {
    throw new Error("Booking created but no id returned");
  }
  context.bookingId = bookingId;

  await runStep(report, {
    flow,
    name: "confirm booking",
    method: "POST",
    route: `/api/bookings/${bookingId}/confirm`,
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "POST", `/api/bookings/${bookingId}/confirm`, {
        token: context.providerToken,
      }),
  });
}

async function runPaymentsFlow(baseUrl, report, context) {
  const flow = "Payments";

  await runStep(report, {
    flow,
    name: "list transactions",
    method: "GET",
    route: "/api/payments/transactions",
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "GET", "/api/payments/transactions", {
        token: context.userToken,
      }),
  });

  await runStep(report, {
    flow,
    name: "initialize payment (gateway-dependent)",
    method: "POST",
    route: "/api/payments/initialize",
    expect: statusUnder500,
    note: "Passes on any non-5xx response to isolate app-level failures from gateway setup differences.",
    action: () =>
      httpRequest(baseUrl, "POST", "/api/payments/initialize", {
        token: context.userToken,
        json: {
          amount: 100,
          currency: "NGN",
          type: "booking_payment",
          bookingId: context.bookingId,
          email: DEFAULT_CREDENTIALS.user.email,
          description: "Pass B payment initialize check",
        },
      }),
  });

  await runStep(report, {
    flow,
    name: "webhook payload guard",
    method: "POST",
    route: "/api/payments/webhook/paystack",
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "POST", "/api/payments/webhook/paystack", {
        json: {},
      }),
  });
}

async function runAdminFlow(baseUrl, report, context) {
  const flow = "Admin";

  await runStep(report, {
    flow,
    name: "dashboard stats",
    method: "GET",
    route: "/api/moderation/dashboard/stats",
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "GET", "/api/moderation/dashboard/stats", {
        token: context.adminToken,
      }),
  });

  await runStep(report, {
    flow,
    name: "list reports",
    method: "GET",
    route: "/api/moderation/reports",
    expect: statusIs(200),
    action: () =>
      httpRequest(baseUrl, "GET", "/api/moderation/reports", {
        token: context.adminToken,
      }),
  });

  const unknownPostId = "00000000-0000-4000-8000-0000000000aa";
  await runStep(report, {
    flow,
    name: "delete safe missing content",
    method: "DELETE",
    route: `/api/moderation/content/post/${unknownPostId}`,
    expect: statusUnder500,
    action: () =>
      httpRequest(
        baseUrl,
        "DELETE",
        `/api/moderation/content/post/${unknownPostId}`,
        {
          token: context.adminToken,
        },
      ),
  });
}

function printReport(report) {
  console.log("\nPass B Happy-Path Report");
  console.log("------------------------");
  console.log(`Base URL: ${report.baseUrl}`);
  console.log(`Total steps: ${report.steps.length}`);

  const passed = report.steps.filter((s) => s.pass).length;
  const failed = report.steps.filter((s) => !s.pass).length;
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  for (const step of report.steps) {
    const icon = step.pass ? "PASS" : "FAIL";
    const status = String(step.status).padEnd(5, " ");
    console.log(
      `- [${icon}] [${step.flow}] ${step.method} ${step.route} -> ${status} (${step.durationMs}ms)`,
    );
    if (step.note) {
      console.log(`  note: ${step.note}`);
    }
    if (step.error) {
      console.log(`  error: ${step.error}`);
    }
  }
}

async function runPassB(baseUrl) {
  const report = {
    baseUrl,
    steps: [],
  };

  const tokens = await resolveTokens(baseUrl);
  const context = {
    adminToken: tokens.admin,
    providerToken: tokens.provider,
    userToken: tokens.user,
  };
  const flowRunners = [
    runIdentityFlow,
    runProfileAndPreferencesFlow,
    runSocialFlow,
    runMarketplaceFlow,
    runPaymentsFlow,
    runAdminFlow,
  ];

  for (const runner of flowRunners) {
    try {
      await runner(baseUrl, report, context);
    } catch (error) {
      // Continue to next flow to produce a complete report.
      console.error(`Flow failed: ${error.message}`);
    }
  }

  return report;
}

async function main() {
  const args = parseArgs();
  const targetPort = args.startServer
    ? START_PORT
    : new URL(DEFAULT_BASE_URL).port;
  const baseUrl = args.startServer
    ? `http://127.0.0.1:${targetPort}`
    : DEFAULT_BASE_URL;

  let server;
  try {
    if (args.startServer) {
      console.log(`Starting API server on port ${targetPort}...`);
      server = startServer(targetPort);
      await waitUntilReady(baseUrl);
    }

    const report = await runPassB(baseUrl);
    printReport(report);

    const failedCount = report.steps.filter((s) => !s.pass).length;
    if (failedCount > 0) {
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
