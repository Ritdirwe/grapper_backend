const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST_MAIN = path.join(ROOT, 'dist', 'main.js');
const DIST_SWAGGER = path.join(ROOT, 'dist', 'swagger.json');
const DIST_SWAGGER_CLIENT = path.join(ROOT, 'dist', 'swagger-client.json');
const DIST_SWAGGER_PROVIDER = path.join(ROOT, 'dist', 'swagger-provider.json');
const DIST_SWAGGER_ADMIN = path.join(ROOT, 'dist', 'swagger-admin.json');
const ROOT_SWAGGER = path.join(ROOT, 'swagger.json');
const ROOT_SWAGGER_CLIENT = path.join(ROOT, 'swagger-client.json');
const ROOT_SWAGGER_PROVIDER = path.join(ROOT, 'swagger-provider.json');
const ROOT_SWAGGER_ADMIN = path.join(ROOT, 'swagger-admin.json');
const HOST = '127.0.0.1';
const PORT = process.env.SWAGGER_GEN_PORT || '3111';
const BASE_URL = `http://${HOST}:${PORT}`;
const TIMEOUT_MS = 60000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDocsJson(endpointPath) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < TIMEOUT_MS) {
    try {
      const response = await fetch(`${BASE_URL}${endpointPath}`);
      if (response.ok) {
        return response.text();
      }
    } catch (_) {
      // Keep polling until timeout.
    }

    await sleep(1000);
  }

  throw new Error(`Timed out waiting for ${BASE_URL}${endpointPath}`);
}

function startServer() {
  if (!fs.existsSync(DIST_MAIN)) {
    throw new Error(`Compiled entry not found at ${DIST_MAIN}. Run build first.`);
  }

  return spawn('node', [DIST_MAIN], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT,
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function stopServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');
}

async function main() {
  let server;

  try {
    server = startServer();
    server.stdout.on('data', (chunk) => process.stdout.write(`[swagger-gen] ${chunk}`));
    server.stderr.on('data', (chunk) => process.stderr.write(`[swagger-gen] ${chunk}`));

    const [allDocsJsonText, clientDocsJsonText, providerDocsJsonText, adminDocsJsonText] =
      await Promise.all([
        waitForDocsJson('/api/docs-json'),
        waitForDocsJson('/api/docs/client-json'),
        waitForDocsJson('/api/docs/provider-json'),
        waitForDocsJson('/api/docs/admin-json'),
      ]);

    fs.writeFileSync(DIST_SWAGGER, allDocsJsonText);
    fs.writeFileSync(DIST_SWAGGER_CLIENT, clientDocsJsonText);
    fs.writeFileSync(DIST_SWAGGER_PROVIDER, providerDocsJsonText);
    fs.writeFileSync(DIST_SWAGGER_ADMIN, adminDocsJsonText);

    fs.writeFileSync(ROOT_SWAGGER, allDocsJsonText);
    fs.writeFileSync(ROOT_SWAGGER_CLIENT, clientDocsJsonText);
    fs.writeFileSync(ROOT_SWAGGER_PROVIDER, providerDocsJsonText);
    fs.writeFileSync(ROOT_SWAGGER_ADMIN, adminDocsJsonText);

    console.log(`Swagger docs generated at ${DIST_SWAGGER}, ${DIST_SWAGGER_CLIENT}, ${DIST_SWAGGER_PROVIDER}, and ${DIST_SWAGGER_ADMIN}`);
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
