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

  // If modal is still visible after reloadTimeout, reload the page and wait again
  if (modalVisible) {
    console.log("Restart overlay didn't disappear after 15 seconds. Reloading page...");
    await page.reload({ waitUntil: 'domcontentloaded' });
    // Optionally, wait again for the modal to disappear after reloading
  }

  // Final check to ensure the modal has disappeared
  if (await isModalVisible(page)) {
    throw new Error('Restart overlay did not disappear after waiting and reloading.');
  }

  console.log('Restart overlay has disappeared, proceeding with the test.');
};
