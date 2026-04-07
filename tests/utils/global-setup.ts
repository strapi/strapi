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
  // Navigate to the admin page to set localStorage
  const port = process.env.PORT || 1337;
  await page.goto(`http://127.0.0.1:${port}/admin`);

  // Set a default local storage so the guided tour is disabled by default
  await page.evaluate((config) => {
    localStorage.setItem('STRAPI_GUIDED_TOUR', JSON.stringify(config));
  }, guidedTourState);
};

async function globalSetup() {
  // Create a browser context and set up localStorage
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await setGuidedTourLocalStorage(page, STRAPI_GUIDED_TOUR_CONFIG);

  // Save the storage state to be used by all tests - save it in the e2e directory
  const storageStatePath = path.join(__dirname, '..', 'e2e', 'playwright-storage-state.json');
  await context.storageState({ path: storageStatePath });

  await browser.close();
}

export default globalSetup;
