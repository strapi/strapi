import { test as base, expect } from '@playwright/test';
import { extendPiwiFixtures } from '@piwitests/reporter';

// The reporter alone is enough for flaky tracking (playwright.base.config.js). The capture
// fixtures wrap every page, locator and request, which slows each test, so they are a
// separate opt-in: PIWI_FIXTURES=true, and only when the reporter is active too.
const piwiFixtures =
  Boolean(process.env.PIWI_DASHBOARD_URL) && process.env.PIWI_FIXTURES?.toLowerCase() === 'true';

export const test: typeof base = piwiFixtures ? extendPiwiFixtures(base) : base;
export { expect };
