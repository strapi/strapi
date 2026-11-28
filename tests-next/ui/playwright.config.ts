import path from 'node:path';

import { defineConfig, devices, type Project } from '@playwright/test';
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
 * Browser projects (RFC D10). Chromium always; WebKit in CI, or locally with TESTS_WEBKIT=true.
 * Each project sets its server mode, so a `prod` project only adds an entry here.
 */
const withWebkit = !!process.env.CI || process.env.TESTS_WEBKIT === 'true';

const projects: Project<AppOptions>[] = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], serverMode: 'develop' },
  },
  ...(withWebkit
    ? [
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'], serverMode: 'develop' as const },
        },
      ]
    : []),
];

/**
 * Also the config of `npx playwright test`, UI mode (`--ui`) and the VS Code extension: run them
 * from tests-next/ui (see its README).
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
  // One app and DB per run for now. Parallel workers and sharding need one app each (CMS-2483,
  // see fixtures/app.ts).
  workers: 1,
  projects,
});
