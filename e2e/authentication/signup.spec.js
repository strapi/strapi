import { test, expect } from '@playwright/test';
// eslint-disable-next-line import/extensions
import { resetDatabaseAndImportDataFromPath } from '../scripts/dts-import';
import { fillValidSignUpForm } from './utils';

test.describe('Sign Up', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath({ filePath: './e2e/data/without-admin.tar' });
    await page.goto('/admin');
    await fillValidSignUpForm({ page });
  });

  test('a user cannot submit the form if the first name field is not filled', async ({ page }) => {
    expect(
      await page.getByRole('textbox', { name: 'First name *' }).getAttribute('aria-required')
    ).toBeTruthy();
  });

  test('a user cannot submit the form if the email is: not provided, not lowercase or not a valid email address', async ({
    page,
  }) => {
    const emailInput = page.getByRole('textbox', { name: 'Email *' });
    const letsStartButton = page.getByRole('button', { name: "Let's start" });

    const fillEmailAndSubmit = async (emailValue) => {
      await emailInput.fill(emailValue);
      await letsStartButton.click();
      await expect(emailInput).toBeFocused();
    };

    expect(await emailInput.getAttribute('aria-required')).toBeTruthy();

    await fillEmailAndSubmit('ADMIN@ADMIN.COM');
    await expect(page.getByText('The value must be a lowercase string')).toBeVisible();

    await fillEmailAndSubmit('notanemail');
    await expect(page.getByText('Value is an invalid email')).toBeVisible();
  });

  test("a user cannot submit the form if a password isn't provided or doesn't meet the password validation requirements", async ({
    page,
  }) => {
    const passwordInput = page.getByRole('textbox', { name: 'Password *' });
    const confirmPasswordInput = page.getByRole('textbox', { name: 'Confirm Password *' });
    const letsStartButton = page.getByRole('button', { name: "Let's start" });

    const fillPasswordAndSubmit = async (passwordValue) => {
      await passwordInput.fill(passwordValue);
      await letsStartButton.click();
      await expect(passwordInput).toBeFocused();
    };

    const arePasswordsRequired = [
      await passwordInput.getAttribute('aria-required'),
      await confirmPasswordInput.getAttribute('aria-required'),
    ];
    arePasswordsRequired.forEach((required) => {
      expect(required).toBeTruthy();
    });

    await fillPasswordAndSubmit('noNumberInHere');
    await expect(page.getByText('Password must contain at least one number')).toBeVisible();

    await fillPasswordAndSubmit('lowerca5e');
    await expect(
      page.getByText('Password must contain at least one uppercase character')
    ).toBeVisible();

    await fillPasswordAndSubmit('S4ort');
    await expect(page.getByText('Value is shorter than the minimum')).toBeVisible();

    await fillPasswordAndSubmit('doesNotMatch');
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('a user should be able to signup when the strapi instance starts fresh', async ({
    page,
  }) => {
    await page.getByRole('button', { name: "Let's start" }).click();

    await page.waitForURL('**/admin/');
    await expect(page).toHaveTitle('Homepage');
  });
});
