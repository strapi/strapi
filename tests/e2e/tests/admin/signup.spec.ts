import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD, TITLE_HOME } from '../../constants';
import { Admin } from '../../pageHelpers/Admin';

test.describe('Sign Up', () => {
  let admin: Admin;

  test.beforeEach(async ({ page }) => {
    admin = new Admin(page);
    await resetDatabaseAndImportDataFromPath('without-admin.tar', (cts) =>
      cts.filter((ct) => ct !== 'plugin::i18n.locale')
    );
    await admin.visit();
    await admin.fillValidSignUpForm('John', 'Smith', ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD);
  });

  test('a user cannot submit the form if the first name field is not filled', async () => {
    const nameInput = admin.page.getByRole('textbox', { name: 'First name' });

    await nameInput.fill('');
    await admin.submitForm();
    await expect(nameInput).toBeFocused();
    await expect(admin.page.getByText('Value is required')).toBeVisible();
  });

  test('a user cannot submit the form if the email is: not provided, not lowercase or not a valid email address', async () => {
    const emailInput = admin.page.getByRole('textbox', { name: 'Email' });

    const fillEmailAndSubmit = async (emailValue) => {
      await emailInput.fill(emailValue);
      await admin.submitForm();
      await expect(emailInput).toBeFocused();
    };

    await fillEmailAndSubmit('');
    await expect(admin.page.getByText('Value is required')).toBeVisible();

    await fillEmailAndSubmit(ADMIN_EMAIL_ADDRESS.toUpperCase());
    await expect(admin.page.getByText('The value must be a lowercase string')).toBeVisible();

    await fillEmailAndSubmit('notanemail');
    await expect(admin.page.getByText('This is not a valid email')).toBeVisible();
  });

  test("a user cannot submit the form if a password isn't provided or doesn't meet the password validation requirements", async () => {
    const passwordInput = admin.page.getByRole('textbox', { name: 'Password', exact: true });

    const fillPasswordAndSubmit = async (passwordValue) => {
      await passwordInput.fill(passwordValue);
      await admin.submitForm();
      await expect(passwordInput).toBeFocused();
    };

    await fillPasswordAndSubmit('');
    await expect(admin.page.getByText('Value is required')).toBeVisible();

    await fillPasswordAndSubmit('noNumberInHere');
    await expect(admin.page.getByText('Password must contain at least one number')).toBeVisible();

    await fillPasswordAndSubmit('lowerca5e');
    await expect(
      admin.page.getByText('Password must contain at least one uppercase character')
    ).toBeVisible();

    await fillPasswordAndSubmit('S4ort');
    await expect(admin.page.getByText('The value is too short')).toBeVisible();

    await fillPasswordAndSubmit('doesNotMatch');
    await expect(admin.page.getByText('Passwords do not match')).toBeVisible();
  });

  test('a user should be able to signup when the strapi instance starts fresh', async () => {
    await admin.submitForm();

    await expect(admin.page).toHaveTitle(TITLE_HOME);
  });

  test('a user should be redirected to /usecase page if they mark news as true', async () => {
    await admin.checkKeepMeUpdated();
    await admin.submitForm();

    // Wait for navigation to complete
    await admin.waitForUsecasePage();
  });
});
