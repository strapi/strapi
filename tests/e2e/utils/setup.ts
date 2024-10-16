import type { Page } from '@playwright/test';

import { login as loginFunc } from './login';
import { resetFiles as resetFilesFunc } from './file-reset';
import { resetDatabaseAndImportDataFromPath } from './dts-import';
import { navToHeader, skipCtbTour } from './shared';

export type SharedSetupOptions = {
  login?: boolean; // Whether to log in to the application
  skipTour?: boolean; // Whether to skip the CTB tour or not
  resetFiles?: boolean; // Whether to reset files before tests
  importData?: string; // Path to the data to be imported into the database (null if no import is needed)
  afterSetup?: ({ page }: { page: Page }) => Promise<void>; // An async function for custom setup logic that runs after the main setup
};

// A cache to store which setups have been run for a given id
const setupRegistry: Record<string, boolean> = {};

/**
 * Shared setup utility to handle common test initialization steps like logging in,
 * resetting files, and importing data, with the ability to run certain setup steps
 * only once per test suite based on a unique identifier (`id`).
 *
 * @param {string} id - A unique identifier to track setup execution and ensure certain steps (e.g., reset files, import data) run only once.
 * @param {Page} page - Playwright's Page object for interacting with the browser.
 * @param {SharedSetupOptions} options - Configuration options for the setup, including:
 *   - login: Whether to log in to the application.
 *   - resetFiles: Whether to reset files before tests.
 *   - importData: Path to the data to be imported into the database.
 *   - afterSetup: A custom function that runs once after the setup is complete.
 *   - skipTour: navigate to CTB and click 'skip tour'. This will fail if a login is not performed first.
 *
 * WARNING:
 * Using `sharedSetup` in this way introduces a risk of tests becoming dependent
 * on the order in which they are executed. Since certain setup steps run only once
 * per suite, subsequent tests may rely on the state left by previous tests.
 *
 * This approach should primarily be used when the setup time is significant,
 * or in test suites that follow a user story flow where later tests are
 * intended to be dependent on the previous ones.
 */
export const sharedSetup = async (
  id: string,
  page: Page,
  { login, resetFiles, importData, afterSetup, skipTour }: SharedSetupOptions
) => {
  let run = !setupRegistry[id];

  if (run) {
    setupRegistry[id] = true;

    // Run one-time setup steps
    if (resetFiles) {
      await resetFilesFunc();
    }
    if (importData) {
      await resetDatabaseAndImportDataFromPath(importData);
    }
  }

  // This part always runs, regardless of setup being initialized
  if (login) {
    await page.goto('/admin');
    await loginFunc({ page });
  }

  if (skipTour) {
    // Go to CTB first to skip the tour
    await navToHeader(page, ['Content-Type Builder'], 'Content-Type Builder');
    await skipCtbTour(page);
  }

  if (run) {
    // Run any custom one-time setup logic passed via afterSetup
    if (afterSetup) {
      await afterSetup({ page });
    }
  }
};
