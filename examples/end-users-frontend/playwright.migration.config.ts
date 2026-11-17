import { randomBytes } from 'node:crypto';

import { defineConfig, devices } from '@playwright/test';

const STRAPI_URL = 'http://localhost:1337';
const SAME_SITE_URL = 'http://localhost:5173';

// Secret-shaped values are made when the run starts, never written down. The config is loaded again
// in every worker, which finds them in the environment the runner passed on, so the specs read the
// password the seed script gave the migrated user.
process.env.E2E_MIGRATION_PASSWORD ??= `${randomBytes(12).toString('base64url')}-9aA!`;
process.env.E2E_MIGRATION_JWT_SECRET ??= randomBytes(24).toString('base64');
process.env.E2E_END_USERS_SECRET ??= randomBytes(32).toString('base64');

/**
 * The migration end to end, apart from the other specs: its own database, and Strapi started twice
 * on it. `e2e/migration/seed-users-permissions.mjs` first makes a project that still uses Users &
 * Permissions, with a user, a provider and an administrator; then Strapi starts with the end-users
 * plugin migrating it (`END_USERS_E2E_MIGRATION` in `e2e-migration/harness.ts`).
 *
 * Run it with `yarn playwright test -c playwright.migration.config.ts`.
 */
export default defineConfig({
  testDir: './e2e/migration',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'same-site',
      use: { ...devices['Desktop Chrome'], baseURL: SAME_SITE_URL },
      testMatch: /sign-in\.spec\.ts$/,
    },
    {
      // The admin panel is on Strapi's own address. It runs after the sign-in, on the same database.
      name: 'admin',
      use: { ...devices['Desktop Chrome'], baseURL: STRAPI_URL },
      testMatch: /admin-report\.spec\.ts$/,
      dependencies: ['same-site'],
    },
  ],
  webServer: [
    {
      // The seed starts Strapi as a project on Users & Permissions and stops it; the second start
      // is the one the specs talk to. The first start builds the admin panel, hence the timeout.
      command:
        'END_USERS_E2E_MIGRATION=seed node ../end-users-frontend/e2e/migration/seed-users-permissions.mjs && yarn develop --no-watch-admin',
      cwd: '../end-users',
      url: `${STRAPI_URL}/_health`,
      reuseExistingServer: false,
      timeout: 600_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        END_USERS_E2E_MIGRATION: 'migrate',
        E2E_MIGRATION_PASSWORD: process.env.E2E_MIGRATION_PASSWORD,
        JWT_SECRET: process.env.E2E_MIGRATION_JWT_SECRET,
        PUBLIC_URL: STRAPI_URL,
        FRONTEND_URL: SAME_SITE_URL,
        // Named so that the seed script, which deletes it, accepts it
        DATABASE_FILENAME: '.tmp/e2e-migration.db',
        END_USERS_SECRET: process.env.E2E_END_USERS_SECRET,
        STRAPI_TELEMETRY_DISABLED: 'true',
        END_USERS_RATE_LIMIT: 'false',
      },
    },
    {
      command: 'yarn dev --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_STRAPI_URL: STRAPI_URL },
    },
  ],
});
