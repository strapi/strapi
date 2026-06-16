import { defineConfig, devices } from '@playwright/test';

/**
 * Self-contained Playwright smoke test for "Strapi as a primitive".
 *
 * Unlike the main `tests/e2e` harness (which generates a full scaffolded app and
 * builds the admin panel), this boots the *programmatic* headless server from
 * the compiled `dist/index.js` and drives a real browser against it — proof that
 * the `defineApp` + `startStrapi` host actually serves HTTP in a browser.
 *
 * `test:e2e` runs `tsc` first, so `dist/index.js` exists before `webServer`
 * starts it.
 */
const PORT = Number(process.env.PORT) || 1343;
const HOST = process.env.HOST || '127.0.0.1';
const baseURL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.spec.ts',

  /* A single browser is enough for a smoke test; keep it fast and deterministic. */
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  /* Per-test timeout. Booting Strapi happens in `webServer`, not here. */
  timeout: 30 * 1000,
  expect: { timeout: 10 * 1000 },

  /* Hard cap on the whole run so a hung browser/server can't get us stuck,
   * regardless of how the test is invoked (it covers the ~180s webServer boot). */
  globalTimeout: 240 * 1000,

  reporter: [['list']],

  use: {
    baseURL,
    trace: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  /* Boot the programmatic server before the tests and tear it down after. */
  webServer: {
    command: 'node dist/index.js',
    url: `${baseURL}/api/hello`,
    env: {
      PORT: String(PORT),
      HOST,
    },
    /* Booting Strapi (DB sync + plugins) takes ~15s; allow generous headroom. */
    timeout: 180 * 1000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
