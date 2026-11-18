import execa from 'execa';

import type { Page } from '@playwright/test';

const RESTART_OVERLAY = 'text="Waiting for restart..."';

/**
 * How long the admin gets, once Strapi answers again after a restart, to close the restart
 * overlay itself: it polls the schema status every 200 ms, then refetches the schema and the
 * user's permissions.
 */
const OVERLAY_CLOSE_GRACE_MS = 3000;

/**
 * Resolves true once Strapi was seen down and has then answered for OVERLAY_CLOSE_GRACE_MS,
 * false when `isSettled` turns true or `timeoutMs` passes first. A restart missed entirely
 * (never seen down) resolves false, leaving the caller on its overlay timeout.
 */
const waitForServerBack = async (timeoutMs: number, isSettled: () => boolean) => {
  const port = process.env.PORT?.trim();
  if (!port) {
    return false;
  }
  const url = `http://127.0.0.1:${port}/_health`;
  const deadline = Date.now() + timeoutMs;
  let wentDown = false;
  let upSince: number | null = null;

  while (!isSettled() && Date.now() < deadline) {
    if (!(await isServerHealthy(url))) {
      wentDown = true;
      upSince = null;
    } else if (wentDown) {
      upSince ??= Date.now();
      if (Date.now() - upSince >= OVERLAY_CLOSE_GRACE_MS) {
        return true;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
};

// Function to check modal visibility
const isModalVisible = async (page: Page) => {
  return page.isVisible(RESTART_OVERLAY);
};

/**
 * Wait for a restart modal to appear, but instead of failing if it doesn't, attempt to
 * refresh the page and see if it comes back up
 */
export const waitForRestart = async (page, timeout = 60000) => {
  const initialWaitForModal = 5000; // Time to wait for the modal to initially appear
  const reloadTimeout = 15000; // 15 seconds before trying to reload

  // Initially wait for the modal to become visible
  try {
    await page.waitForSelector(RESTART_OVERLAY, {
      state: 'visible',
      timeout: initialWaitForModal,
    });
  } catch (error) {
    console.log('The modal did not become visible within the initial wait period.');
    throw error; // Or handle this scenario as appropriate
  }

  // Now wait until the modal is hidden, for at most reloadTimeout. This returns as soon as the
  // overlay goes away, where checking once a second added half a second per restart on average.
  //
  // The admin closes the overlay once its own status request reaches the restarted server. When
  // that request was sent to the worker being replaced it gets no answer (the same hang the
  // health probes had), and the overlay stays until the reload below: 9 of 51 restarts in a
  // local content-type-builder run. So also watch the server: once it went down and has
  // answered again for OVERLAY_CLOSE_GRACE_MS with the overlay still shown, reload right away
  // instead of waiting out the rest of reloadTimeout.
  let settled = false;
  const hidden = page
    .waitForSelector(RESTART_OVERLAY, { state: 'hidden', timeout: reloadTimeout })
    .then(
      () => 'hidden' as const,
      () => 'timeout' as const
    );
  const serverBack = waitForServerBack(reloadTimeout, () => settled).then((back) =>
    back ? ('server-back' as const) : ('timeout' as const)
  );
  const outcome = await Promise.race([hidden, serverBack]);
  settled = true;

  const modalVisible = outcome !== 'hidden' && (await isModalVisible(page));

  // If modal is still visible, reload the page and wait again
  if (modalVisible) {
    console.log(
      outcome === 'server-back'
        ? 'Strapi is back but the restart overlay is still shown. Reloading page...'
        : "Restart overlay didn't disappear after 15 seconds. Reloading page..."
    );
    await pollHealthCheck();
    await page.reload({ waitUntil: 'domcontentloaded' });
    // Optionally, wait again for the modal to disappear after reloading
  }

  // Final check to ensure the modal has disappeared
  if (await isModalVisible(page)) {
    throw new Error('Restart overlay did not disappear after waiting and reloading.');
  }

  console.log('Restart overlay has disappeared, proceeding with the test.');
};

// TODO: Find a better way to restart a Strapi test app (signal, etc...)
export const restart = async () => {
  if (!process.env.TEST_APP_PATH) {
    console.warn('Could not restart the application because TEST_APP_PATH not set');
    return;
  }

  const filepath = 'src/force-restart-from-playwright-instance.js';

  console.log('Forcing a restart...');

  await execa('touch', [filepath], {
    stdio: 'inherit',
    cwd: process.env.TEST_APP_PATH,
  });

  await delay(1);

  await execa('rm', [filepath], {
    stdio: 'inherit',
    cwd: process.env.TEST_APP_PATH,
  });

  // TODO:  This is both a waste of time and flaky.
  //        We need to find a way to access playwright server output and watch for the "up" log to appear
  await pollHealthCheck();
};

export const delay = (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

/**
 * How long one health probe may take before it counts as "not up".
 *
 * `/_health` answers in milliseconds. A probe that reaches `strapi develop` while it replaces its
 * worker on a restart can get no answer at all, and Node's fetch then waits for its default
 * 300 s headers timeout (reproduced locally: 3 of ~900 probes across 10 restarts hung for 300 s).
 * That one probe stalled resetFiles or waitForRestart for five minutes, past the 90 s hook timeout.
 */
const HEALTH_PROBE_TIMEOUT_MS = 2000;

/**
 * One `HEAD /_health` probe: true when Strapi answers OK within HEALTH_PROBE_TIMEOUT_MS.
 */
export const isServerHealthy = async (url: string) => {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(HEALTH_PROBE_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const pollHealthCheck = async (interval = 1000, timeout = 30000) => {
  const port = process.env.PORT?.trim();
  if (!port) {
    throw new Error(
      'pollHealthCheck: PORT is not set. Run e2e via `yarn test:e2e` so the browser runner sets PORT (and TEST_APP_PATH) for this process.'
    );
  }
  const url = `http://127.0.0.1:${port}/_health`;
  console.log(`Starting to poll: ${url}`);

  // A deadline rather than a sum of intervals, so time spent inside a probe counts too.
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (await isServerHealthy(url)) {
      console.log('The service is up and running!');
      return; // Exit if the service is up
    }
    console.log('Waiting for the service to come up...');
    // Wait for the specified interval before trying again
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  // On timeout
  console.error('Timeout reached, service did not become available in time.');
};
