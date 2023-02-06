import { test, expect } from '@playwright/test';
// eslint-disable-next-line import/extensions
import { resetDatabaseAndImportDataFromPath } from '../scripts/dts-import';

test.describe('Log Out', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath({ filePath: './e2e/data/with-admin.tar' });
    await page.goto('/admin');

    await page.getByLabel('Email').fill('test@testing.com');
    await page
      .getByLabel('Password*', {
        exact: true,
      })
      .fill('myTestPassw0rd');

    await page.getByRole('button', { name: 'Login' }).click();
  });

  test('a user should be able to logout', async ({ page }) => {
    await page.getByText('John Smith').click();
    await page.getByText('Logout').click();

    await expect(page.getByText('Log in to your Strapi account')).toBeVisible();
  });
});
