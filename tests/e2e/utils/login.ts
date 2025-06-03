import type { Page } from '@playwright/test';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../constants';

/**
 * Log in to an e2e test app
 */
export const login = async ({
  page,
  username = ADMIN_EMAIL_ADDRESS,
  password = ADMIN_PASSWORD,
  rememberMe = false,
}: {
  page: Page;
  username?: string;
  password?: string;
  rememberMe?: boolean;
}) => {
  await page.getByLabel('Email').fill(username);
  await page
    .getByLabel('Password*', {
      exact: true,
    })
    .fill(password);

  if (rememberMe) {
    await page.getByLabel('Remember me').click();
  }

  await page.getByRole('button', { name: 'Login' }).click();

  try {
    const dialog = page.getByRole('dialog', { name: "We're glad to have you on board" });
    // Ensure the growth trial banner is closed
    await dialog.getByRole('button', { name: 'Close' }).click();
  } catch (e) {
    // No dialog found, safe to continue
  }
};
