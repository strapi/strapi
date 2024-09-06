import { test, expect } from '@playwright/test';

import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD, TITLE_HOME } from '../../constants';

/**
 * Fill in the sign up form with valid values
 * @param {EventEmitter} page - playwright page
 */
export const fillValidSignUpForm = async ({ page }) => {
  await page.getByLabel('First name').fill('John');
  await page.getByLabel('Last name').fill('Smith');
  await page.getByLabel('Email').fill(ADMIN_EMAIL_ADDRESS);
  await page
    .getByLabel('Password*', {
      exact: true,
    })
    .fill(ADMIN_PASSWORD);
  await page
    .getByLabel('Confirm Password*', {
      exact: true,
    })
    .fill(ADMIN_PASSWORD);
};

test.describe('Sign Up', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('without-admin.tar', (cts) =>
      cts.filter((ct) => ct !== 'plugin::i18n.locale')
    );
    await page.goto('/admin');
    await fillValidSignUpForm({ page });
  });

  test('a user cannot submit the form if the first name field is not filled', async ({ page }) => {
    const nameInput = page.getByRole('textbox', { name: 'First name' });

    await nameInput.fill('');
    await page.getByRole('button', { name: "Let's start" }).click();
    await expect(nameInput).toBeFocused();
    await expect(page.getByText('Value is required')).toBeVisible();
  });

  test('a user cannot submit the form if the email is: not provided, not lowercase or not a valid email address', async ({
    page,
  }) => {
    const emailInput = page.getByRole('textbox', { name: 'Email' });
    const letsStartButton = page.getByRole('button', { name: "Let's start" });

    const fillEmailAndSubmit = async (emailValue) => {
      await emailInput.fill(emailValue);
      await letsStartButton.click();
      await expect(emailInput).toBeFocused();
    };

    await fillEmailAndSubmit('');
    await expect(page.getByText('Value is required')).toBeVisible();

    await fillEmailAndSubmit(ADMIN_EMAIL_ADDRESS.toUpperCase());
    await expect(page.getByText('The value must be a lowercase string')).toBeVisible();

    await fillEmailAndSubmit('notanemail');
    await expect(page.getByText('This is not a valid email')).toBeVisible();
  });

  test("a user cannot submit the form if a password isn't provided or doesn't meet the password validation requirements", async ({
    page,
  }) => {
    const passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
    const letsStartButton = page.getByRole('button', { name: "Let's start" });

    const fillPasswordAndSubmit = async (passwordValue) => {
      await passwordInput.fill(passwordValue);
      await letsStartButton.click();
      await expect(passwordInput).toBeFocused();
    };

    await fillPasswordAndSubmit('');
    await expect(page.getByText('Value is required')).toBeVisible();

    await fillPasswordAndSubmit('noNumberInHere');
    await expect(page.getByText('Password must contain at least one number')).toBeVisible();

    await fillPasswordAndSubmit('lowerca5e');
    await expect(
      page.getByText('Password must contain at least one uppercase character')
    ).toBeVisible();

    await fillPasswordAndSubmit('S4ort');
    await expect(page.getByText('The value is too short')).toBeVisible();

    await fillPasswordAndSubmit('doesNotMatch');
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('a user should be able to signup when the strapi instance starts fresh', async ({
    page,
  }) => {
    await page.getByRole('button', { name: "Let's start" }).click();

    await expect(page).toHaveTitle(TITLE_HOME);
  });

  test('a user should be redirected to /usecase page if they mark news as true', async ({
    page,
  }) => {
    await page.getByLabel(/Keep me updated/).check();
    await page.getByRole('button', { name: "Let's start" }).click();

    // Wait for navigation to complete
    await page.waitForURL('**/usecase**');

    // Assert that we're on the /usecase page
    expect(page.url()).toContain('/usecase');

    await expect(page.getByText('Tell us a bit more about yourself')).toBeVisible();
  });
});
