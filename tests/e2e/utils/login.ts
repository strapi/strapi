import type { Page } from '@playwright/test';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../constants';

/**
 * Log in to an e2e test app
 * it is often flaky, resulting in an infinite spinning loader, so it will attempt several retries before failing
 */
// TODO: solve why this is so flaky
export const login = async ({ page, rememberMe = false }: { page: Page; rememberMe?: boolean }) => {
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.getByLabel('Email').fill(ADMIN_EMAIL_ADDRESS);
      await page
        .getByLabel('Password*', {
          exact: true,
        })
        .fill(ADMIN_PASSWORD);

      if (rememberMe) {
        await page.getByLabel('Remember me').click();
      }
      await page.getByRole('button', { name: 'Login' }).click();
      await page.waitForTimeout(5000);
      if ((await page.title()) !== 'Homepage | Strapi') {
        throw new Error('Login failed to load homepage');
      }
      break; // If the page loads successfully, break the loop
    } catch (error) {
      // If this was the last retry, give up
      if (i === maxRetries - 1) {
        throw error;
      }

      await page.reload();

      // if it actually did log in, proceed instead of trying again
      if ((await page.title()) === 'Homepage | Strapi') {
        break;
      }
    }
  }
};
