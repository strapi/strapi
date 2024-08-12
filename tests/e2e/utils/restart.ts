import { type Page, test } from '@playwright/test';

// Function to check modal visibility
const isModalVisible = async (page: Page) => {
  return page.isVisible('text="Waiting for restart..."');
};

/**
 * Wait for a restart modal to appear, but instead of failing if it doesn't, attempt to
 * refresh the page and see if it comes back up
 */
export const waitForRestart = async (page, timeout = 60000) => {
  test.setTimeout(100_000); // Increase timeout, sometimes server restarts are very slow

  const initialWaitForModal = 3_000; // Time to wait for the modal to initially appear
  let elapsedTime = 0;
  const checkInterval = 2_000; // millseconds to poll for server coming back up
  const reloadTimeout = 30_000; // millseconds before trying to reload the page

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

  // TODO: remove this once the restart modal is completely reliable in the admin ui
  // If modal is still visible after reloadTimeout, reload the page and wait again
  if (modalVisible) {
    console.log("Restart overlay didn't disappear after 15 seconds. Reloading page...");
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  // Final check to ensure the modal has disappeared
  if (await isModalVisible(page)) {
    throw new Error("Restart modal didn't close");
  }

  console.log('Restart overlay has disappeared, proceeding with the test.');
};
