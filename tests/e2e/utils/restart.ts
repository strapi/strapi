import { type Page, test } from '@playwright/test';

// Function to check modal visibility
const isModalVisible = async (page: Page) => {
  return await Promise.any([
    page.waitForSelector('text="Waiting for restart..."', { state: 'visible' }),
    page.waitForSelector('text="is taking longer"', { state: 'visible' }),
  ])
    .then(() => true)
    .catch(() => false);
};

/**
 * Wait for a restart modal to appear and then disappear
 */
export const waitForRestart = async (page, timeout = 60000) => {
  test.setTimeout(100_000); // Increase timeout, sometimes server restarts are very slow

  const initialWaitForModal = 3_000; // Time to wait for the modal to initially appear
  let elapsedTime = 0;
  const checkInterval = 2_000; // millseconds to poll for server coming back up
  const waitForRestartTimeout = 30_000; // millseconds before trying to reload the page

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

  // Now wait until the modal is not visible or until the reloadTimeout
  let modalVisible = await isModalVisible(page);
  while (modalVisible && elapsedTime < waitForRestartTimeout) {
    await new Promise((r) => setTimeout(r, checkInterval));
    elapsedTime += checkInterval;
    modalVisible = await isModalVisible(page);
  }

  if (modalVisible) {
    throw new Error("Restart modal didn't close");
  }

  console.log('Restart overlay has disappeared, proceeding with the test.');
};
