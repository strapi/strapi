import { Page, expect } from '@playwright/test';

// Function to check modal visibility
const isModalVisible = async (page: Page) => {
  return page.isVisible('text="Waiting for restart..."');
};

/**
 * Wait for a restart modal to appear, but instead of failing if it doesn't, attempt to
 * refresh the page and see if it comes back up
 */
export const waitForRestart = async (page, timeout = 60000) => {
  const initialWaitForModal = 5000; // Time to wait for the modal to initially appear
  let elapsedTime = 0;
  const checkInterval = 1000; // Check every 1 second
  const reloadTimeout = 15000; // 15 seconds before trying to reload

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
  while (modalVisible && elapsedTime < reloadTimeout) {
    await new Promise((r) => setTimeout(r, checkInterval));
    elapsedTime += checkInterval;
    modalVisible = await isModalVisible(page);
  }

  if (modalVisible) {
    throw new Error("Restart modal didn't close")
  }

  console.log('Restart overlay has disappeared, proceeding with the test.');
};
