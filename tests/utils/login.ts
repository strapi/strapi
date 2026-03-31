import type { Page } from '@playwright/test';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../e2e/constants';

/**
 * Log out via UI (clears in-memory auth state), then log in as the given user.
 * Use when switching users in e2e tests.
 */
export const switchUser = async ({
  page,
  username,
  password,
}: {
  page: Page;
  username: string;
  password: string;
}): Promise<void> => {
  await page.getByRole('button', { name: 'Open user menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.waitForURL('**/auth/login');
  await login({ page, username, password });
};

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

  // Check for dialog with a short timeout
  const dialog = page.getByRole('dialog', { name: "We're glad to have you on board" });
  const isDialogVisible = await dialog.isVisible().catch(() => false);

  if (isDialogVisible) {
    await dialog.getByRole('button', { name: 'Close' }).click();
  }
};
