import { defineConfig } from '@playwright/test';

import type { AppOptions } from './fixtures/app';

/**
 * Browser projects and the auth setup come with the E2E suite issues (CMS-1949 and after).
 * The server mode is a project option, so a `prod` project can be added next to `develop`.
 */
export default defineConfig<AppOptions>({
  testDir: './tests',
  testMatch: '**/*.ui-test.ts',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'line' : 'list',
  globalSetup: './setup/global-setup.ts',
  // One app and DB per run for now. Parallel workers need one app each (see fixtures/app.ts).
  workers: 1,
  use: {
    serverMode: 'develop',
  },
});
