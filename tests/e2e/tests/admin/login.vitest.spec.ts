import { describe, test, beforeEach, afterEach } from 'vitest';

import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { toggleRateLimiting } from '../../../utils/rate-limit';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD, TITLE_HOME, TITLE_LOGIN } from '../../constants';
import { login } from '../../../utils/login';
import {
  createBrowserSession,
  closeBrowserSession,
  type BrowserSession,
} from '../../vitest/browser-fixture';
import { expect } from '../../vitest/expect';

/**
 * Vitest pilot port of `login.spec.ts`. Vitest is the runner; the browser is driven by the
 * `playwright` library via `createBrowserSession()`, which preserves the cookie-inspection,
 * multi-page and `page.request` behaviour the original spec relies on.
 */
describe('Login', () => {
  let session: BrowserSession;

  beforeEach(async () => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    session = await createBrowserSession();
    await session.context.clearCookies();
    await session.page.goto('/admin');
  });

  afterEach(async () => {
    await closeBrowserSession(session);
  });

  describe('Successful login', () => {
    test('A user should be able to log in with or without making their authentication persistent', async () => {
      const { context } = session;
      let { page } = session;

      // Test without making user authentication persistent
      await login({ page, rememberMe: false });
      await expect(page).toHaveTitle(TITLE_HOME);

      // Verify session cookie is created
      const cookies = await context.cookies();
      const refreshCookie = cookies.find((cookie) => cookie.name === 'strapi_admin_refresh');
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie?.httpOnly).toBe(true);

      // Close page but keep context (simulates tab close, not browser restart)
      await page.close();
      page = await context.newPage();
      await page.goto('/admin');
      // TODO: should still be logged in as browser context persists ?
      await expect(page).toHaveTitle(TITLE_HOME);

      // Clear cookies to simulate session expiry
      await context.clearCookies();
      await page.goto('/admin');
      await expect(page).toHaveTitle(TITLE_LOGIN);

      // Test with making user authentication persistent
      await login({ page, rememberMe: true });
      await expect(page).toHaveTitle(TITLE_HOME);

      // Verify persistent cookie has explicit expiry
      const persistentCookies = await context.cookies();
      const persistentRefreshCookie = persistentCookies.find(
        (cookie) => cookie.name === 'strapi_admin_refresh'
      );
      expect(persistentRefreshCookie?.expires).toBeGreaterThan(-1);

      // Clear cookies to test persistence behavior
      await context.clearCookies();
      await page.goto('/admin');
      await expect(page).toHaveTitle(TITLE_LOGIN);
    });
  });

  describe('Rate limit', () => {
    test('Should display a rate limit error message after 5 attempts to login', async () => {
      const { page, browser } = session;
      const browserName = browser.browserType().name();

      async function clickLoginTimes(n: number) {
        for (let i = 0; i < n; i++) {
          // eslint-disable-next-line no-await-in-loop
          await page.getByRole('button', { name: 'Login' }).click();
        }
      }

      await toggleRateLimiting(page, true);

      await page
        .getByLabel('Email*', { exact: true })
        .fill(ADMIN_EMAIL_ADDRESS.replace('@', `+${browserName}@`));
      await page.getByLabel('Password*', { exact: true }).fill(ADMIN_PASSWORD);
      clickLoginTimes(6);

      await expect(page.getByText('Too many requests, please try again later.')).toBeVisible();

      await toggleRateLimiting(page, false);
    });
  });

  describe('Validations', () => {
    test('A user should see a validation errors when not passing in an email, a wrong email, not passing a password or a wrong password', async () => {
      const { page } = session;

      // Test without email value
      await page.getByLabel('Password*', { exact: true }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Value is required')).toBeVisible();
      await expect(page.getByLabel('Email*', { exact: true })).toBeFocused();

      // Test without password value
      await page.getByLabel('Email*', { exact: true }).fill(ADMIN_EMAIL_ADDRESS);
      await page.getByLabel('Password*', { exact: true }).fill('');
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Value is required')).toBeVisible();
      await expect(page.getByLabel('Password*')).toBeFocused();

      // Test with a wrong email value
      await page.getByLabel('Email*', { exact: true }).fill('e2e+wrong-email@strapi.io');
      await page.getByLabel('Password*', { exact: true }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Invalid credentials')).toBeVisible();

      // Test with a wrong password value
      await page.getByLabel('Email*', { exact: true }).fill(ADMIN_EMAIL_ADDRESS);
      await page.getByLabel('Password*', { exact: true }).fill('wrongPassword');
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Invalid credentials')).toBeVisible();
    });
  });

  describe('Forgot password', () => {
    test('A user should be able to access the forgot password page', async () => {
      const { page } = session;

      // Test forgot password redirection
      await page.getByRole('link', { name: 'Forgot your password?' }).click();
      await expect(page.getByText('Password Recovery')).toBeVisible();

      await page.getByRole('link', { name: 'Ready to sign in?' }).click();
    });
  });
});
