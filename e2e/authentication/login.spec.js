import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../scripts/dts-import';

test.describe('Authentication | Login', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath({ filePath: './e2e/data/with-admin.tar' });
    await page.goto('/admin');
  });

  test.describe('Successful login', () => {
    test('A user should be able to log in with or without making their authentication persistent', async ({
      page,
      context,
    }) => {
      // Test without making user authentication persistent
      await page.getByLabel('Email*', { exact: true }).fill('test@testing.com');
      await page.getByLabel('Password*', { exact: true }).fill('myTestPassw0rd');

      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page).toHaveTitle('Homepage');

      await page.close();

      page = await context.newPage();
      await page.goto('/admin');
      await expect(page).toHaveTitle('Strapi Admin');

      // Test with making user authentication persistent
      await page.getByLabel('Email*', { exact: true }).fill('test@testing.com');
      await page.getByLabel('Password*', { exact: true }).fill('myTestPassw0rd');

      await page.getByLabel('Remember me').click();

      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page).toHaveTitle('Homepage');

      await page.close();

      page = await context.newPage();
      await page.goto('/admin');
      await expect(page).toHaveTitle('Homepage');
    });
  });

  test.describe('Rate limit on login', () => {
    test('Should display a rate limit error message after 5 attempts to login', async ({
      page,
      browserName,
    }) => {
      await page.request.fetch('/api/config/ratelimit/enable', {
        method: 'POST',
        data: { value: true },
      });

      await page.getByLabel('Email*', { exact: true }).fill(`test@${browserName}.com`);
      await page.getByLabel('Password*', { exact: true }).fill('wrongPassword');
      await page.getByRole('button', { name: 'Login' }).click();
      await page.getByRole('button', { name: 'Login' }).click();
      await page.getByRole('button', { name: 'Login' }).click();
      await page.getByRole('button', { name: 'Login' }).click();
      await page.getByRole('button', { name: 'Login' }).click();
      await page.getByRole('button', { name: 'Login' }).click();

      await expect(page.getByText('Too many requests, please try again later.')).toBeVisible();

      await page.request.fetch('/api/config/ratelimit/enable', {
        method: 'POST',
        data: { value: false },
      });
    });
  });

  test.describe('Validation checks', () => {
    test('A user should see a validation errors when not passing in an email, a wrong email, not passing a password or a wrong password', async ({
      page,
    }) => {
      // Test without email value
      await page.getByLabel('Password*', { exact: true }).fill('myTestPassw0rd');
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Value is required')).toBeVisible();
      await expect(await page.getByLabel('Email*', { exact: true })).toBeFocused();

      // Test without password value
      await page.getByLabel('Email*', { exact: true }).fill('test@testing.com');
      await page.getByLabel('Password*', { exact: true }).fill('');
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Value is required')).toBeVisible();
      await expect(await page.getByLabel('Password*')).toBeFocused();

      // Test with a wrong email value
      await page.getByLabel('Email*', { exact: true }).fill('wrongEmail@testing.com');
      await page.getByLabel('Password*', { exact: true }).fill('myTestPassw0rd');
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Invalid credentials')).toBeVisible();

      // Test with a wrong password value
      await page.getByLabel('Email*', { exact: true }).fill('test@testing.com');
      await page.getByLabel('Password*', { exact: true }).fill('wrongPassword');
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Invalid credentials')).toBeVisible();
    });
  });

  test.describe('Other actions than logging in', () => {
    test('A user should be able to acces the forgot password page and change the application language', async ({
      page,
    }) => {
      // Test forgot password redirection
      await page.getByRole('link', { name: 'Forgot your password?' }).click();
      await expect(page.getByText('Password Recovery')).toBeVisible();

      await page.getByRole('link', { name: 'Ready to sign in?' }).click();

      // Test changing application language
      await page.getByRole('button', { name: 'English' }).click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Space');
      await expect(page.getByText('Bienvenue !')).toBeVisible();
    });
  });
});
