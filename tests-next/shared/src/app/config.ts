import path from 'node:path';

/**
 * Ports, paths and env of the test apps, in one place.
 */

export const REPO_ROOT = path.resolve(__dirname, '../../../..');

/**
 * Generated apps live under the repo root so that Node resolves `@strapi/*` from the root
 * `node_modules`, where Yarn links the workspaces: no yalc and no install in the app.
 * `test-apps/` is git- and prettier-ignored, and outside the Yarn workspaces.
 */
export const APPS_DIR = path.join(REPO_ROOT, 'test-apps', 'next');

/** First port of the test apps. See `appPort` for how suites and workers split the range. */
export const PORT_BASE = Number(process.env.TESTS_PORT_BASE ?? 8600);

export const HOST = '127.0.0.1';

/** Per request: a server that accepts connections but never answers must not stall startup. */
export const PROBE_TIMEOUT = 2_000;

export type Suite = 'ui' | 'api' | 'cli';

/** Each suite gets its own port range, so suites can run at the same time. */
const SUITE_PORT_OFFSET: Record<Suite, number> = { ui: 0, api: 20, cli: 40 };

/**
 * Port of the `index`-th app of a suite: one per Playwright or Vitest worker. A worker runs one
 * file at a time and stops its servers at the end of it, so the files of a worker share a port.
 */
export const appPort = (suite: Suite, index: number) =>
  PORT_BASE + SUITE_PORT_OFFSET[suite] + index;

/** The `strapi` CLI of the workspace, run with the app as cwd. */
export const strapiBin = () =>
  path.join(path.dirname(require.resolve('@strapi/strapi/package.json')), 'bin', 'strapi.js');

/** NODE_ENV of the test apps. The config scaffolders write to `config/env/<APP_NODE_ENV>`. */
export const APP_NODE_ENV = 'development';

/**
 * The env of the runner, without its `DATABASE_*` variables. Every spawn of a test app (generation,
 * admin build, server) starts from it: the database env comes from `startServer({ database })`
 * only (see db/database.ts), and `databaseEnv` doesn't set every `DATABASE_*` variable
 * (`DATABASE_URL`, for example, would override the host and database on Postgres).
 */
export const inheritedEnv = (): NodeJS.ProcessEnv => {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('DATABASE_')) {
      delete env[key];
    }
  }
  return env;
};

/**
 * Env every test app (and app generation) runs with, on top of `inheritedEnv()` and the
 * caller's env. The database env comes from the `database` option of `startServer` and
 * `seedApp` (see app/env.ts and db/database.ts).
 */
export const baseEnv = (): NodeJS.ProcessEnv => ({
  HOST,
  STRAPI_TELEMETRY_DISABLED: 'true',
  NODE_ENV: APP_NODE_ENV,
});
