import { Page, chromium } from '@playwright/test';
import path from 'path';

export const STRAPI_GUIDED_TOUR_CONFIG = {
  tours: {
    contentTypeBuilder: {
      currentStep: 0,
      length: 5,
      isCompleted: false,
    },
    contentManager: {
      currentStep: 0,
      length: 4,
      isCompleted: false,
    },
    apiTokens: {
      currentStep: 0,
      length: 4,
      isCompleted: false,
    },
    strapiCloud: {
      currentStep: 0,
      length: 0,
      isCompleted: false,
    },
  },
  enabled: false,
  completedActions: [],
};

export const setGuidedTourLocalStorage = async (
  page: Page,
  guidedTourState: typeof STRAPI_GUIDED_TOUR_CONFIG
) => {
  // Use a path so Playwright resolves `baseURL` from project config (e2e apps use 8000+, not 1337).

  await page.goto('/admin');

  await page.evaluate((config) => {
    localStorage.setItem('STRAPI_GUIDED_TOUR', JSON.stringify(config));
  }, guidedTourState);
};

async function globalSetup() {
  const port = process.env.PORT?.trim();
  if (!port) {
    throw new Error(
      'globalSetup: PORT is not set. Run e2e via `yarn test:e2e` so the browser runner sets PORT (same port as the Playwright webServer).'
    );
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: `http://127.0.0.1:${port}`,
  });
  const page = await context.newPage();

  await setGuidedTourLocalStorage(page, STRAPI_GUIDED_TOUR_CONFIG);

  // Save the storage state to be used by all tests - save it in the e2e directory
  const storageStatePath = path.join(__dirname, '..', 'e2e', 'playwright-storage-state.json');
  await context.storageState({ path: storageStatePath });

  await browser.close();
}

export default globalSetup;
