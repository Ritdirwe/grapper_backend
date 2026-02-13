const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST_MAIN = path.join(ROOT, 'dist', 'main.js');
const DIST_SWAGGER = path.join(ROOT, 'dist', 'swagger.json');
const ROOT_SWAGGER = path.join(ROOT, 'swagger.json');
const HOST = '127.0.0.1';
const PORT = process.env.SWAGGER_GEN_PORT || '3111';
const BASE_URL = `http://${HOST}:${PORT}`;
const TIMEOUT_MS = 60000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDocsJson() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < TIMEOUT_MS) {
    try {
      const response = await fetch(`${BASE_URL}/api/docs-json`);
      if (response.ok) {
        return response.text();
      }
    } catch (_) {
      // Keep polling until timeout.
    }

    await sleep(1000);
  }

  throw new Error(`Timed out waiting for ${BASE_URL}/api/docs-json`);
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

    const docsJsonText = await waitForDocsJson();
    fs.writeFileSync(DIST_SWAGGER, docsJsonText);
    fs.writeFileSync(ROOT_SWAGGER, docsJsonText);

    console.log(`Swagger docs generated at ${DIST_SWAGGER}`);
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
