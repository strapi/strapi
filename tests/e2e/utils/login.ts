import type { Page } from '@playwright/test';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD, TITLE_HOME, URL_ROOT } from '../constants';

/**
 * Clear cookies, go to admin, and log in to an e2e test app, landing on the Strapi dashboard
 */
export const login = async ({ page, rememberMe = false }: { page: Page; rememberMe?: boolean }) => {
  // sometimes it gets stuck on the login screen with an invalid session and can't log in
  await page.context().clearCookies();

  // go to the root page which should be the logged in
  await page.goto(URL_ROOT, { waitUntil: 'networkidle' });

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
  await page.waitForLoadState('networkidle');

  await waitForTitle(page, TITLE_HOME, 5000);
};

export const waitForTitle = async (page: Page, title: string, timeout = 5000) => {
  for (let i = 0; i < timeout / 100; i++) {
    if ((await page.title()) === title) {
      return;
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`Title did not change to ${title} after ${timeout}ms`);
};
