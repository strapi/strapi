import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import fs from 'node:fs/promises';

import type { GlobalSetupContext } from 'vitest/node';

import {
  E2E_PORT,
  E2E_HOST,
  BASE_URL,
  REPO_ROOT,
  TEST_APP_DIR,
  TEST_APP_PATH,
  APP_TEMPLATE_DIR,
} from './constants';

const WEBSERVER_TIMEOUT = Number(process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT ?? 160_000);

// Reach the runner helpers (CJS `.js`) and the existing Playwright global-setup (`.ts`) via dynamic
// `import()` — Vitest transforms TS and handles CJS interop, whereas Node's native `require` can't
// resolve the `.ts` files. `default ?? mod` covers both `module.exports =` and ESM default shapes.
const interopDefault = <T>(mod: any): T => (mod && mod.default) ?? mod;

const pathExists = async (p: string) => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

/**
 * Ensure the first e2e test app exists. App generation (yalc publish + scaffolding) is heavy and
 * environment-sensitive, so we only run it when the app is missing — the common path is that
 * `yarn test:e2e` / `--setup` already generated it. Mirrors `tests/scripts/run-tests.js`.
 */
const ensureTestApp = async () => {
  if (await pathExists(TEST_APP_PATH)) return;

  // eslint-disable-next-line no-console
  console.log(`[vitest-e2e] No test app at ${TEST_APP_PATH}; generating one (first run is slow)…`);

  const { publishYalc, setupTestApps, getCurrentTestApps, setupTestEnvironment } =
    interopDefault<any>(await import('../../utils/runners/shared-setup'));

  await publishYalc(REPO_ROOT);
  const currentTestApps = await getCurrentTestApps(TEST_APP_DIR);
  await setupTestApps({
    testAppDirectory: TEST_APP_DIR,
    testAppPaths: [TEST_APP_PATH],
    templateDir: APP_TEMPLATE_DIR,
    setup: false,
    currentTestApps: currentTestApps.map((p: string) => path.basename(p)),
    setupTestEnvironment,
    commitE2eBaseline: true,
  });
};

const waitForServer = async (url: string, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // Any HTTP response (even a redirect to /admin/auth/login) means the server is up.
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status > 0) return;
    } catch {
      // not listening yet
    }
    await sleep(1_000);
  }
  throw new Error(`[vitest-e2e] Strapi did not become reachable at ${url} within ${timeoutMs}ms`);
};

/**
 * Boot the test app's dev server, exactly like `playwright.base.config.js`'s `webServer`:
 * `npm run develop -- --no-watch-admin` with PORT/HOST pinned.
 */
const startServer = (): ChildProcess => {
  // Vitest sets NODE_ENV=test on its own process. Forwarding that to the dev server makes
  // users-permissions throw on a missing jwtSecret instead of auto-generating one (see
  // packages/plugins/users-permissions/server/bootstrap/index.js). Playwright's `webServer` runs
  // with NODE_ENV unset → `strapi develop` defaults it to 'development'; replicate that here.
  const { NODE_ENV: _ignored, ...parentEnv } = process.env;
  const child = spawn('npm', ['run', 'develop', '--', '--no-watch-admin'], {
    cwd: TEST_APP_PATH,
    stdio: 'inherit',
    env: { ...parentEnv, NODE_ENV: 'development', PORT: E2E_PORT, HOST: E2E_HOST },
  });
  child.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[vitest-e2e] Failed to start Strapi dev server:', err);
  });
  return child;
};

let server: ChildProcess | undefined;

export async function setup({ provide }: GlobalSetupContext) {
  await ensureTestApp();

  server = startServer();
  await waitForServer(`${BASE_URL}/admin`, WEBSERVER_TIMEOUT);

  // Seed `STRAPI_GUIDED_TOUR` localStorage into the shared storage-state JSON. The existing
  // Playwright global-setup already does exactly this and writes to the same file; reuse it so
  // the two runners stay in lock-step. It reads `process.env.PORT`, which we have set above.
  process.env.PORT = E2E_PORT;
  const playwrightGlobalSetup = interopDefault<() => Promise<void>>(
    await import('../../utils/global-setup')
  );
  await playwrightGlobalSetup();

  // Expose the base URL to tests (in addition to PORT in the env).
  provide('baseURL', BASE_URL);
}

export async function teardown() {
  if (!server) return;
  server.kill('SIGTERM');
  // Give Strapi a moment to release the port/db before Vitest exits.
  await sleep(2_000);
  if (!server.killed) server.kill('SIGKILL');
}
