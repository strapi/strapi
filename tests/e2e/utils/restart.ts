import { Page } from '@playwright/test';

/**
 * Wait for a restart modal to appear, but instead of failing if it doesn't, attempt to
 * refresh the page and see if it comes back up
 */
export const waitForRestart = async (page: Page, timeout = 60000) => {
  const initialWaitForModal = 5000; // Time to wait for the modal to initially appear
  const reloadTimeout = 30000; // wait in ms before trying to reload

  // Initially wait for the modal to become visible
  try {
    await page.waitForSelector('text="Waiting for restart..."', {
      state: 'visible',
      timeout: initialWaitForModal,
    });
  } catch (error) {
    console.log('The modal did not become visible within the initial wait period.');
    throw error; // Or handle this scenario as appropriate
  }

  // Wait until the modal is not visible or until the reloadTimeout
  try {
    await page.waitForSelector('text="Waiting for restart..."', {
      state: 'hidden',
      timeout: reloadTimeout,
    });
  } catch (error) {
    console.log(
      `Restart overlay didn't disappear after ${reloadTimeout / 1000} seconds. Reloading page...`
    );
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Wait again for the modal to disappear after reloading
    try {
      await page.waitForSelector('text="Waiting for restart..."', {
        state: 'hidden',
        timeout: timeout - reloadTimeout,
      });
    } catch (finalError) {
      throw new Error('Restart overlay did not disappear after waiting and reloading.');
    }
  }

  console.log('Restart overlay has disappeared, proceeding with the test.');
};
