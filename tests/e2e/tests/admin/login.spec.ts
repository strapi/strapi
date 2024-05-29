import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { toggleRateLimiting } from '../../utils/rate-limit';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD, TITLE_HOME, TITLE_LOGIN } from '../../constants';
import { login } from '../../utils/login';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
  });

  test.describe('Successful login', () => {
    test('A user should be able to log in with or without making their authentication persistent', async ({
      page,
      context,
    }) => {
      // Test without making user authentication persistent
      await login({ page });
      await expect(page).toHaveTitle(TITLE_HOME);

      await page.close();

      page = await context.newPage();
      await page.goto('/admin');
      await expect(page).toHaveTitle(TITLE_LOGIN);

      // Test with making user authentication persistent
      await login({ page, rememberMe: true });
      await expect(page).toHaveTitle(TITLE_HOME);

      await page.close();

      page = await context.newPage();
      await page.goto('/admin');
      await expect(page).toHaveTitle(TITLE_HOME);
    });
  });

  test.describe('Rate limit', () => {
    test('Should display a rate limit error message after 5 attempts to login', async ({
      page,
      browserName,
    }) => {
      async function clickLoginTimes(n) {
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

  test.describe('Validations', () => {
    test('A user should see a validation errors when not passing in an email, a wrong email, not passing a password or a wrong password', async ({
      page,
    }) => {
      // Test without email value
      await page.getByLabel('Password*', { exact: true }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Value is required')).toBeVisible();
      await expect(await page.getByLabel('Email*', { exact: true })).toBeFocused();

      // Test without password value
      await page.getByLabel('Email*', { exact: true }).fill(ADMIN_EMAIL_ADDRESS);
      await page.getByLabel('Password*', { exact: true }).fill('');
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Value is required')).toBeVisible();
      await expect(await page.getByLabel('Password*')).toBeFocused();

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

  test.describe('Forgot password', () => {
    test('A user should be able to access the forgot password page', async ({ page }) => {
      // Test forgot password redirection
      await page.getByRole('link', { name: 'Forgot your password?' }).click();
      await expect(page.getByText('Password Recovery')).toBeVisible();

      await page.getByRole('link', { name: 'Ready to sign in?' }).click();
    });
  });
});
