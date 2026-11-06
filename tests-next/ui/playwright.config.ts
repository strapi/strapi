import { defineConfig } from '@playwright/test';

/**
 * Minimal config for the scaffold. Browser projects, the server lifecycle and the auth setup
 * come with the E2E suite issues (CMS-1949 and after).
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.ui-test.ts',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'line' : 'list',
});
