import { test, type Page } from '@playwright/test';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../e2e/constants';

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

/**
 * Sign the page's browser context in through the admin API, without the login form.
 *
 * `POST /admin/login` sets the httpOnly refresh cookie on the context (`page.request` shares the
 * context's cookie jar). The access token goes where the admin panel keeps it after a login
 * without "Remember me": the `jwtToken` cookie on the panel path (see `setCookie` in
 * `packages/core/admin/admin/src/utils/cookies.ts`). The next navigation to `/admin` opens the
 * panel already signed in.
 *
 * Call it after any database reset: a reset replaces the admin users, which ends earlier sessions.
 * Tests about logging in itself keep `login`, which drives the form.
 */
export const loginWithApi = async ({
  page,
  username = ADMIN_EMAIL_ADDRESS,
  password = ADMIN_PASSWORD,
}: {
  page: Page;
  username?: string;
  password?: string;
}) => {
  const response = await page.request.post('/admin/login', {
    data: { email: username, password, rememberMe: false },
  });

  if (!response.ok()) {
    throw new Error(
      `API login as ${username} failed: HTTP ${response.status()} ${await response.text()}`
    );
  }

  const { data } = await response.json();
  const { hostname } = new URL(test.info().project.use.baseURL!);

  await page.context().addCookies([
    {
      name: 'jwtToken',
      value: encodeURIComponent(data.token),
      domain: hostname,
      path: '/admin',
    },
  ]);
};
