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

export type Suite = 'ui' | 'api' | 'cli';

/** Each suite gets its own port range, so suites can run at the same time. */
const SUITE_PORT_OFFSET: Record<Suite, number> = { ui: 0, api: 20, cli: 40 };

/** Port of the `index`-th app of a suite (a Playwright worker or a Jest worker). */
export const appPort = (suite: Suite, index: number) =>
  PORT_BASE + SUITE_PORT_OFFSET[suite] + index;

/** The `strapi` CLI of the workspace, run with the app as cwd. */
export const strapiBin = () =>
  path.join(path.dirname(require.resolve('@strapi/strapi/package.json')), 'bin', 'strapi.js');

/** Env every test app runs with, on top of the caller's env. */
export const baseEnv = (): NodeJS.ProcessEnv => ({
  HOST,
  STRAPI_TELEMETRY_DISABLED: 'true',
  STRAPI_DISABLE_UPDATE_NOTIFICATION: 'true',
  NODE_ENV: 'development',
});
