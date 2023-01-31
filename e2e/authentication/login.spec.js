import { test, expect } from '@playwright/test';

test.use({ storageState: 'storageState.json' });

test.describe('Authentication | Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');

    await page.getByText('John Smith').click();
    await page.getByRole('link', { name: 'Logout' }).click();
  });

  test.describe('Successful login', () => {
    test('A user should be able to log in', async ({ page }) => {
      await page.getByLabel('Email*', { exact: true }).fill('test@testing.com');
      await page.getByLabel('Password*', { exact: true }).fill('myTestPassw0rd');

      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page).toHaveTitle('Homepage');
    });

    test('A user should be able to log in and make his authentication persistent', async ({
      page,
      context,
    }) => {
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

    test('A user should be able to log in without making his authentication persistent', async ({
      page,
      context,
    }) => {
      await page.getByLabel('Email*', { exact: true }).fill('test@testing.com');
      await page.getByLabel('Password*', { exact: true }).fill('myTestPassw0rd');

      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page).toHaveTitle('Homepage');

      await page.close();

      page = await context.newPage();
      await page.goto('/admin');
      await expect(page).toHaveTitle('Strapi Admin');
    });
  });

  test.describe('Validation checks', () => {
    test('A user should see a validation error when not passing in an email', async ({ page }) => {
      await page.getByLabel('Password*', { exact: true }).fill('myTestPassw0rd');

      await page.getByRole('button', { name: 'Login' }).click();

      await expect(page.getByText('Value is required')).toBeVisible();
      await expect(await page.getByLabel('Email*', { exact: true })).toBeFocused();
    });

    test('A user should see a validation error when not passing in a password', async ({
      page,
    }) => {
      await page.getByLabel('Email*', { exact: true }).fill('test@testing.com');

      await page.getByRole('button', { name: 'Login' }).click();

      await expect(page.getByText('Value is required')).toBeVisible();
      await expect(await page.getByLabel('Password*')).toBeFocused();
    });

    test('A user should see a validation error when entering a wrong email', async ({ page }) => {
      await page.getByLabel('Email*', { exact: true }).fill('wrongEmail@testing.com');
      await page.getByLabel('Password*', { exact: true }).fill('myTestPassw0rd');

      await page.getByRole('button', { name: 'Login' }).click();

      await expect(page.getByText('Invalid credentials')).toBeVisible();
    });

    test('A user should see a validation error when entering a wrong password', async ({
      page,
    }) => {
      await page.getByLabel('Email*', { exact: true }).fill('test@testing.com');
      await page.getByLabel('Password*', { exact: true }).fill('wrongPassword');

      await page.getByRole('button', { name: 'Login' }).click();

      await expect(page.getByText('Invalid credentials')).toBeVisible();
    });
  });

  test.describe('Other actions than logging in', () => {
    test('A user should be able to acces the forgot password page', async ({ page }) => {
      await page.getByRole('link', { name: 'Forgot your password?' }).click();

      await expect(page.getByText('Password Recovery')).toBeVisible();
    });

    test('A user should be able to change language', async ({ page }) => {
      await page.getByRole('button', { name: 'English' }).click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Space');

      await expect(page.getByText('Bienvenue !')).toBeVisible();
    });
  });
});
