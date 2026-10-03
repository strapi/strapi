import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest e2e pilot config.
 *
 * Deliberately NOT matched by the root `vitest.config.ts` projects glob (`packages/**`), so it runs
 * as its own suite via `yarn test:e2e:vitest` and never pollutes unit-test runs. Drives a real
 * browser through the `playwright` library (see `vitest/browser-fixture.ts`) against a booted test
 * app (see `vitest/global-setup.ts`).
 */
const E2E_PORT = process.env.PORT?.trim() || '8000';
const E2E_HOST = process.env.HOST?.trim() || '127.0.0.1';

export default defineConfig({
  // Root at the repo root so the relative helper imports in the migrated specs resolve unchanged.
  root: path.resolve(__dirname, '..', '..'),
  test: {
    include: ['tests/e2e/tests/**/*.vitest.spec.ts'],
    globals: true,
    environment: 'node',
    // E2E is stateful (shared DB, single dev server): never run files/tests in parallel.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    // Mirror playwright.base.config.js: 90s per test, 160s for the server-boot hook.
    testTimeout: Number(process.env.PLAYWRIGHT_TIMEOUT ?? 90_000),
    hookTimeout: Number(process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT ?? 160_000),
    globalSetup: [path.resolve(__dirname, 'vitest', 'global-setup.ts')],
    // Helpers (dts-import.ts, etc.) read process.env.PORT directly; propagate it to the workers.
    env: { PORT: E2E_PORT, HOST: E2E_HOST },
  },
});
