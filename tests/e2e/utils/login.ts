import type { Page } from '@playwright/test';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD, TITLE_HOME, URL_ROOT } from '../constants';

/**
 * Log in to an e2e test app
 * it is often flaky, resulting in an infinite spinning loader, so it will attempt several retries before failing
 */
// TODO: solve why this is so flaky
export const login = async ({ page, rememberMe = false }: { page: Page; rememberMe?: boolean }) => {
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    // go to the root page which should be the logged in
    await page.goto(URL_ROOT);

    // ...unless we already logged in, and are redirected to the home page now
    if (i > 0 && (await page.title()) === TITLE_HOME) {
      break; // If the page loads successfully, break the loop
    }

    await page.getByLabel('Email').fill(ADMIN_EMAIL_ADDRESS);
    await page
      .getByLabel('Password*', {
        exact: true,
      })
      .fill(ADMIN_PASSWORD);

    if (rememberMe) {
      await page.getByLabel('Remember me').click();
    }

    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.getByRole('button', { name: 'Login' }).click(),
    ]);

    if ((await page.title()) === TITLE_HOME) {
      break;
    }
    // if we made it here, we failed to log in, so on to the next try
  }
};
