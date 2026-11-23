import path from 'node:path';

import { defineConfig } from '@playwright/test';
import { editionFromEnv } from '@strapi/tests-shared';

import type { AppOptions } from './fixtures/app';

const REPORTS_DIR = path.join(__dirname, '../../test-apps/next/reports');

/**
 * Edition contract (RFC D6), from STRAPI_TEST_EDITION. A CE run runs every test but the `@ee`
 * ones. An EE run replays the `@ee` and `@smoke` tests only: the rest behaves the same in both
 * editions.
 */
const edition = editionFromEnv();

/**
 * Browser projects and the auth setup come with the E2E suite issues (CMS-1949 and after).
 * The server mode is a project option, so a `prod` project can be added next to `develop`.
 */
export default defineConfig<AppOptions>({
  testDir: './tests',
  testMatch: '**/*.ui-test.ts',
  forbidOnly: !!process.env.CI,
  ...(edition === 'ee' ? { grep: /@ee|@smoke/ } : { grepInvert: /@ee/ }),
  // In CI, JUnit and HTML reports next to the generated apps, uploaded as artifacts.
  reporter: process.env.CI
    ? [
        ['line'],
        ['junit', { outputFile: path.join(REPORTS_DIR, 'junit', 'ui.xml') }],
        ['html', { open: 'never', outputFolder: path.join(REPORTS_DIR, 'ui-html') }],
      ]
    : 'list',
  globalSetup: './setup/global-setup.ts',
  // One app and DB per run for now. Parallel workers need one app each (see fixtures/app.ts).
  workers: 1,
  use: {
    serverMode: 'develop',
  },
});
