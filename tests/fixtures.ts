import { test as base, expect } from '@playwright/test';
import { extendPiwiFixtures } from '@piwitests/reporter';

// Piwi capture is opt-in, like the reporter in playwright.base.config.js: without
// PIWI_DASHBOARD_URL the specs run on the plain Playwright `test`.
export const test: typeof base = process.env.PIWI_DASHBOARD_URL ? extendPiwiFixtures(base) : base;
export { expect };
