import path from 'node:path';

/**
 * Shared constants for the Vitest e2e pilot.
 *
 * The canonical port mirrors the Playwright runner's first test-app slot (`8000 + index`, see
 * `tests/scripts/run-tests.js`). `dts-import.ts` / `global-setup.ts` read `process.env.PORT`
 * directly, so the Vitest config also exports it into the test environment (see `vitest.e2e.config.ts`).
 */
export const E2E_PORT = process.env.PORT?.trim() || '8000';
export const E2E_HOST = process.env.HOST?.trim() || '127.0.0.1';
export const BASE_URL = `http://${E2E_HOST}:${E2E_PORT}`;

/** Repo root, resolved from this file (`<root>/tests/e2e/vitest/constants.ts`). */
export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Generated e2e test apps live here; the pilot uses the first slot. */
export const TEST_APP_DIR = path.join(REPO_ROOT, 'test-apps', 'e2e');
export const TEST_APP_PATH = path.join(TEST_APP_DIR, 'test-app-0');
export const APP_TEMPLATE_DIR = path.join(REPO_ROOT, 'tests', 'app-template');

/** Same storage-state file the Playwright config consumes, so both runners share the seed. */
export const STORAGE_STATE_PATH = path.join(
  REPO_ROOT,
  'tests',
  'e2e',
  'playwright-storage-state.json'
);
