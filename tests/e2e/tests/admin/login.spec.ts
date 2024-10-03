import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { toggleRateLimiting } from '../../utils/rate-limit';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD, TITLE_HOME, TITLE_LOGIN } from '../../constants';
import { login } from '../../utils/login';
import { Admin } from '../../pageHelpers/Admin';

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
      const admin = new Admin(page);

      // Test without making user authentication persistent
      await login({ page });
      await admin.expectHomeTitle();

      await page.close();

      page = await context.newPage();
      await page.goto('/admin');
      await admin.expectLoginTitle();

      // Test with making user authentication persistent
      await login({ page, rememberMe: true });
      await admin.expectHomeTitle();

      await page.close();

      page = await context.newPage();
      await page.goto('/admin');
      await admin.expectHomeTitle();
    });
  });

  test.describe('Rate limit', () => {
    test('Should display a rate limit error message after 5 attempts to login', async ({
      page,
      browserName,
    }) => {
      const admin = new Admin(page);

      await toggleRateLimiting(page, true);

      await admin.fillEmail(ADMIN_EMAIL_ADDRESS.replace('@', `+${browserName}@`));
      await admin.fillPassword(ADMIN_PASSWORD);

      for (let i = 0; i < 6; i++) {
        await admin.clickLoginButton();
      }

      await admin.validateTooManyRequestsError();

      await toggleRateLimiting(page, false);
    });
  });

  test.describe('Validations', () => {
    test('A user should see validation errors when not passing in an email, a wrong email, not passing a password or a wrong password', async ({
      page,
    }) => {
      const admin = new Admin(page);

      // Test without email value
      await admin.fillPassword(ADMIN_PASSWORD);
      await admin.clickLoginButton();
      await admin.validateValueRequiredError();
      await admin.expectValidationErrorFocus('Email*');

      // Test without password value
      await admin.fillEmail(ADMIN_EMAIL_ADDRESS);
      await admin.fillPassword('');
      await admin.clickLoginButton();
      await admin.validateValueRequiredError();
      await admin.expectValidationErrorFocus('Password*');

      // Test with a wrong email value
      await admin.fillEmail('e2e+wrong-email@strapi.io');
      await admin.fillPassword(ADMIN_PASSWORD);
      await admin.clickLoginButton();
      await admin.validateLoginErrorMessage('Invalid credentials');

      // Test with a wrong password value
      await admin.fillEmail(ADMIN_EMAIL_ADDRESS);
      await admin.fillPassword('wrongPassword');
      await admin.clickLoginButton();
      await admin.validateLoginErrorMessage('Invalid credentials');
    });
  });

  test.describe('Forgot password', () => {
    test('A user should be able to access the forgot password page', async ({ page }) => {
      const admin = new Admin(page);

      await admin.clickForgotPassword();
      await admin.checkPasswordRecoveryVisibility();
      await admin.clickBackToLogin();
    });
  });
});
