import { test, expect } from '@playwright/test';
// eslint-disable-next-line import/extensions
import { resetDatabaseAndImportDataFromPath } from '../scripts/dts-import';
import { fillValidSignUpForm } from './utils';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath({ filePath: './e2e/data/without-admin.tar' });
    await page.goto('/admin');
  });

  test.describe('Name Errors', () => {
    test('required', async ({ page }) => {
      expect(
        await page.getByRole('textbox', { name: 'First name *' }).getAttribute('aria-required')
      ).toBeTruthy();
    });
  });

  test.describe('Email Errors', () => {
    test('required', async ({ page }) => {
      expect(
        await page.getByRole('textbox', { name: 'Email *' }).getAttribute('aria-required')
      ).toBeTruthy();
    });

    test('the value must be a lowercase string', async ({ page }) => {
      await fillValidSignUpForm({ page });

      const emailInput = page.getByRole('textbox', { name: 'Email *' });
      await emailInput.fill('ADMIN@ADMIN.COM');
      await page.getByRole('button', { name: "Let's start" }).click();

      await expect(page.getByText('The value must be a lowercase string')).toBeVisible();
      await expect(emailInput).toBeFocused();
    });

    test('the value must be a valid email address', async ({ page }) => {
      await fillValidSignUpForm({ page });

      const emailInput = page.getByRole('textbox', { name: 'Email *' });
      await emailInput.fill('notanemail');
      await page.getByRole('button', { name: "Let's start" }).click();

      await expect(page.getByText('Value is an invalid email')).toBeVisible();
      await expect(emailInput).toBeFocused();
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

    test('must contain at least one uppercase character', async ({ page }) => {
      await fillValidSignUpForm({ page });
      const passwordInput = page.getByLabel('Password*', {
        exact: true,
      });
      await passwordInput.fill('lowerca5e');

      await page.getByRole('button', { name: "Let's start" }).click();

      await expect(
        page.getByText('Password must contain at least one uppercase character')
      ).toBeVisible();
      await expect(passwordInput).toBeFocused();
    });

    test('must be at least 8 characters long', async ({ page }) => {
      await fillValidSignUpForm({ page });
      const passwordInput = page.getByLabel('Password*', {
        exact: true,
      });
      await passwordInput.fill('S4ort');

      await page.getByRole('button', { name: "Let's start" }).click();

      await expect(page.getByText('Value is shorter than the minimum')).toBeVisible();
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
