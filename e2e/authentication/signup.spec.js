import { test, expect } from '@playwright/test';
// eslint-disable-next-line import/extensions
import { resetDatabaseAndImportDataFromPath } from '../scripts/data-transfer';
import { fillValidSignUpForm } from './utils';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/backup.tar');
    await page.goto('/admin');
  });

  test.afterEach(async ({ page }) => {
    await page.request.fetch('/api/database/dump', {
      method: 'POST',
    });
  });

  test.describe('Password Errors', () => {
    test('required', async ({ page }) => {
      const arePasswordsRequired = [
        await page.getByRole('textbox', { name: 'Password *' }).getAttribute('aria-required'),
        await page
          .getByRole('textbox', { name: 'Confirm Password *' })
          .getAttribute('aria-required'),
      ];

      arePasswordsRequired.forEach((required) => {
        expect(required).toBeTruthy();
      });
    });

    test('must contain a number', async ({ page }) => {
      await fillValidSignUpForm({ page });
      const passwordInput = page.getByLabel('Password*', {
        exact: true,
      });
      await passwordInput.fill('noNumberInHere');

      await page.getByRole('button', { name: "Let's start" }).click();

      await expect(page.getByText('Password must contain at least one number')).toBeVisible();
      await expect(passwordInput).toBeFocused();
    });

    test('passwords must match', async ({ page }) => {
      await fillValidSignUpForm({ page });
      const passwordInput = page.getByLabel('Confirm Password*', {
        exact: true,
      });
      await passwordInput.fill('doesNotMatch');

      await page.getByRole('button', { name: "Let's start" }).click();

      await expect(page.getByText('Passwords do not match')).toBeVisible();
      await expect(passwordInput).toBeFocused();
    });
  });

  test('a user should be able to signup when the strapi instance starts fresh', async ({
    page,
  }) => {
    await fillValidSignUpForm({ page });

    await page.getByRole('button', { name: "Let's start" }).click();

    await page.waitForURL('**/admin/');
    await expect(page).toHaveTitle('Homepage');
  });
});
