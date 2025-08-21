import type { Page } from '@playwright/test';

import { login as loginFunc } from './login';
import { resetFiles as resetFilesFunc } from './file-reset';
import { resetDatabaseAndImportDataFromPath } from './dts-import';
import { navToHeader } from './shared';

export type SharedSetupOptions = {
  login?: boolean; // Whether to log in to the application
  resetFiles?: boolean; // Whether to reset files before tests
  importData?: string; // Path to the data to be imported into the database (null if no import is needed)
  afterSetup?: ({ page }: { page: Page }) => Promise<void>; // An async function for custom setup logic that runs after the main setup
  resetAlways?: boolean; // Whether to reset the setup always, even if the setup has already been run
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

 *
 * WARNING:
 * Using `sharedSetup` in this way introduces a risk of tests becoming dependent
 * on the order in which they are executed. This could be dangerous because the execution order
 * is not guaranteed during retries in the CI.
 *
 * This approach should primarily be used when the setup time is significant and the tests don't
 * depend on each other's side effects.
 */
export const sharedSetup = async (
  id: string,
  page: Page,
  { login, resetFiles, importData, afterSetup, resetAlways }: SharedSetupOptions
) => {
  let firstRun = !setupRegistry[id];
  const extraRun = !firstRun && resetAlways;

  if (firstRun || extraRun) {
    setupRegistry[id] = true;

    // Run one-time setup steps
    if (resetFiles) {
      await resetFilesFunc();
    }
    if (importData) {
      await resetDatabaseAndImportDataFromPath(importData);
    }

    if (extraRun) {
      await page.reload();
    }
  }

  // This part always runs, regardless of setup being initialized
  if (login) {
    await page.goto('/admin');
    await loginFunc({ page });
  }

  if (firstRun) {
    // Run any custom one-time setup logic passed via afterSetup
    if (afterSetup) {
      await afterSetup({ page });
    }
  }
};
