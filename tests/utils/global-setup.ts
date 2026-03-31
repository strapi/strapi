import { Page, chromium, type FullConfig } from '@playwright/test';
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
  guidedTourState: typeof STRAPI_GUIDED_TOUR_CONFIG,
  adminURL?: string
) => {
  const url = adminURL ?? `http://127.0.0.1:${process.env.PORT || 1337}/admin`;
  await page.goto(url);

  // Set a default local storage so the guided tour is disabled by default
  await page.evaluate((config) => {
    localStorage.setItem('STRAPI_GUIDED_TOUR', JSON.stringify(config));
  }, guidedTourState);
};

function resolveE2eBaseURL(config: FullConfig): string {
  const fromProject = config.projects[0]?.use?.baseURL;
  if (typeof fromProject === 'string' && fromProject !== '') {
    return fromProject;
  }
  return `http://127.0.0.1:${process.env.PORT ?? 1337}`;
}

async function globalSetup(config: FullConfig) {
  const baseURL = resolveE2eBaseURL(config);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await setGuidedTourLocalStorage(page, STRAPI_GUIDED_TOUR_CONFIG, `${baseURL}/admin`);

  const port = new URL(baseURL).port;
  const storageStatePath = path.join(
    __dirname,
    '..',
    'e2e',
    `playwright-storage-state-${port}.json`
  );
  await context.storageState({ path: storageStatePath });

  await browser.close();
}

export default globalSetup;
