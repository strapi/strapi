import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { BASE_URL, STORAGE_STATE_PATH } from './constants';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * Launch a browser session for a Vitest e2e test.
 *
 * This is the Vitest equivalent of Playwright's built-in `{ page, context }` fixtures: we drive the
 * browser with the `playwright` library directly (re-exported by `@playwright/test`, already a repo
 * dependency) so we keep full access to cookies, multi-page contexts and `page.request` — none of
 * which Vitest's browser mode exposes. `baseURL` + the shared storage state mirror
 * `playwright.base.config.js`.
 */
export const createBrowserSession = async (): Promise<BrowserSession> => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: STORAGE_STATE_PATH,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  return { browser, context, page };
};

export const closeBrowserSession = async (session: BrowserSession | undefined) => {
  await session?.browser.close();
};
