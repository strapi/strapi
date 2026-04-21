'use strict';

/**
 * Smoke test: Strapi built and started with Bun, responds on GET /_health.
 *
 * Prerequisites:
 * - Bun installed (https://bun.sh)
 * - Dependencies installed (`bun install` or `yarn install` at repo root)
 * - Workspace packages compiled (`yarn build` at repo root — required so `strapi build` resolves @strapi/*)
 *
 * Env:
 * - BUN_SMOKE_APP_DIR — absolute or repo-relative path to the Strapi app (default: examples/getstarted)
 * - PORT / HOST — bind address (default PORT 4310, HOST 127.0.0.1)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const defaultApp = path.join(repoRoot, 'examples/getstarted');

const appDir = path.resolve(repoRoot, process.env.BUN_SMOKE_APP_DIR || defaultApp);
const port = Number(process.env.PORT || process.env.BUN_SMOKE_PORT || 4310);
const host = process.env.HOST || '127.0.0.1';

async function resolveBunBinary() {
  const tryBin = (cmd) =>
    new Promise((resolve) => {
      const child = spawn(cmd, ['--version'], { stdio: 'ignore' });
      child.on('exit', (code) => resolve(code === 0 ? cmd : null));
      child.on('error', () => resolve(null));
    });

  let resolved = await tryBin('bun');
  if (resolved) {
    return resolved;
  }

  const home = process.env.HOME || process.env.USERPROFILE || '';
  const fallback = path.join(home, '.bun/bin/bun');
  if (fs.existsSync(fallback)) {
    resolved = await tryBin(fallback);
    if (resolved) {
      return fallback;
    }
  }

  return null;
}

function httpHealthCheck() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: host,
        port,
        path: '/_health',
        method: 'GET',
        timeout: 5000,
      },
      (res) => {
        const result = { status: res.statusCode, strapiHeader: res.headers.strapi };
        res.resume();
        res.on('end', () => resolve(result));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('health request timeout'));
    });
    req.end();
  });
}

async function waitForHealth(timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await httpHealthCheck();
      if (r.status === 204 && r.strapiHeader) {
        return;
      }
    } catch {
      /* retry */
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 750);
    });
  }
  throw new Error(`Timed out waiting for GET http://${host}:${port}/_health (204 + strapi header)`);
}

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, opts);
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code} signal ${signal}`));
      }
    });
  });
}

async function main() {
  const bun = await resolveBunBinary();
  if (!bun) {
    console.error(
      'Bun is not installed or not on PATH. Install from https://bun.sh (e.g. curl -fsSL https://bun.sh/install | bash), then reopen your terminal or add ~/.bun/bin to PATH.'
    );
    process.exit(2);
  }

  const env = {
    ...process.env,
    HOST: host,
    PORT: String(port),
    STRAPI_TELEMETRY_DISABLED: 'true',
    NODE_ENV: 'production',
  };

  console.error(`bun smoke: building app at ${appDir}`);
  await run(bun, ['run', 'build'], { cwd: appDir, stdio: 'inherit', env });

  console.error(`bun smoke: starting server on ${host}:${port}`);
  const startProc = spawn(bun, ['run', 'start'], {
    cwd: appDir,
    env,
    stdio: 'inherit',
  });

  if (!startProc.pid) {
    throw new Error('failed to spawn bun run start');
  }

  try {
    await waitForHealth();
    console.error('bun smoke: OK — GET /_health returned 204');
  } finally {
    try {
      startProc.kill('SIGTERM');
    } catch {
      /* ignore */
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
    try {
      startProc.kill('SIGKILL');
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
