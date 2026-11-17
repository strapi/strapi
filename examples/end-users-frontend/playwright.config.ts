import { randomBytes } from 'node:crypto';

import { defineConfig, devices } from '@playwright/test';

// A secret-shaped value is made when the run starts, never written down; workers inherit it
process.env.E2E_END_USERS_SECRET ??= randomBytes(32).toString('base64');

const STRAPI_URL = 'http://localhost:1337';

// The front end is opened on two addresses. `localhost:5173` is another origin than Strapi but the
// same site (cookies are shared across ports). `127.0.0.1:5173` is another site as well, which is
// the case `cookies.crossSite` exists for. Strapi trusts both (see `FRONTEND_URL` below).
const SAME_SITE_URL = 'http://localhost:5173';
const CROSS_SITE_URL = 'http://127.0.0.1:5173';

// The specs of `e2e/admin` drive Strapi's own admin panel, not the front end, so they belong to the
// `admin` project alone. A regular expression is tested against the whole path of the file, hence
// the `e2e` before `admin`.
const ADMIN_SPECS = /[\\/]e2e[\\/]admin[\\/].*\.spec\.ts$/;

// The specs of `e2e/migration` need a database seeded with Users & Permissions and a Strapi that
// migrates it, which `playwright.migration.config.ts` sets up. Without that they fail, so only that
// config runs them.
const MIGRATION_SPECS = /[\\/]e2e[\\/]migration[\\/]/;

export default defineConfig({
  testDir: './e2e',
  testIgnore: MIGRATION_SPECS,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'same-site',
      use: { ...devices['Desktop Chrome'], baseURL: SAME_SITE_URL },
      testIgnore: [ADMIN_SPECS, MIGRATION_SPECS],
    },
    {
      name: 'cross-site',
      use: { ...devices['Desktop Chrome'], baseURL: CROSS_SITE_URL },
      testIgnore: [ADMIN_SPECS, MIGRATION_SPECS],
    },
    {
      // The admin panel is on Strapi's own address. It runs after the two above, on the database they
      // leave behind: the first admin is registered by whichever admin spec runs first.
      name: 'admin',
      use: { ...devices['Desktop Chrome'], baseURL: STRAPI_URL },
      testMatch: ADMIN_SPECS,
      dependencies: ['same-site', 'cross-site'],
    },
  ],
  webServer: [
    {
      // The Strapi example application. Its first start builds the admin panel, hence the timeout.
      // The database of the previous run goes first (`e2e/reset-database.mjs`), so every run starts
      // empty and Strapi's bootstrap seeds the roles and the sign-up fields again.
      command: 'node ../end-users-frontend/e2e/reset-database.mjs && yarn develop --no-watch-admin',
      cwd: '../end-users',
      url: `${STRAPI_URL}/_health`,
      // Never reuse a running Strapi: it would trust only the origins it was started with.
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PUBLIC_URL: STRAPI_URL,
        FRONTEND_URL: `${SAME_SITE_URL},${CROSS_SITE_URL}`,
        // A throwaway database (`config/database.ts` reads this name, relative to the app), so a
        // run never touches the one `yarn develop` uses, and the fixed secret below never has to
        // sign a developer's own sessions.
        DATABASE_FILENAME: '.tmp/e2e.db',
        END_USERS_SECRET: process.env.E2E_END_USERS_SECRET,
        STRAPI_TELEMETRY_DISABLED: 'true',
        // Every test signs up or in from this machine: Better Auth's per-address limit would
        // answer 429 to the later ones
        END_USERS_RATE_LIMIT: 'false',
      },
    },
    {
      // `--host 127.0.0.1` so the page answers on `localhost` and on `127.0.0.1`, the two sites the
      // projects above open it on. (`yarn dev` alone listens on `localhost` only.)
      command: 'yarn dev --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      // Never reuse a running one either: it may not listen on `127.0.0.1`.
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_STRAPI_URL: STRAPI_URL },
    },
  ],
});
