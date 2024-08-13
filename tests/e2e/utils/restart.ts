import { type Page, test } from '@playwright/test';

/**
 * Wait for a restart modal to appear and then disappear
 */
export const waitForRestart = async (page: Page, timeout = 60_000) => {
  test.setTimeout(120_000); // Increase timeout, sometimes server restarts are very slow

  const initialWaitForModal = 2_000; // Time to wait for the modal to initially appear
  const waitForRestartTimeout = timeout; // milliseconds before trying to wait for modal to disappear
  const checkInterval = 2_000; // milliseconds to poll for the modal being hidden

  // Initially wait for either of the modal messages to become visible
  try {
    await Promise.any([
      page.waitForSelector('text="Waiting for restart..."', {
        state: 'visible',
        timeout: initialWaitForModal,
      }),
      page.waitForSelector('text="is taking longer"', {
        state: 'visible',
        timeout: initialWaitForModal,
      }),
    ]);
  } catch (error) {
    console.log('Neither of the modals became visible within the initial wait period.');
    throw error; // Or handle this scenario as appropriate
  }

  // Now wait until both of the modal messages are not visible anymore
  let elapsedTime = 0;
  while (elapsedTime < waitForRestartTimeout) {
    const isWaitingForRestartVisible = await page.isVisible('text="Waiting for restart..."');
    const isTakingLongerVisible = await page.isVisible('text="is taking longer"');

    if (!isWaitingForRestartVisible && !isTakingLongerVisible) {
      console.log('Restart overlay has disappeared, proceeding with the test.');
      return;
    }

    await new Promise((r) => setTimeout(r, checkInterval));
    elapsedTime += checkInterval;
  }

  throw new Error("Restart modal didn't close within the expected time.");
};
