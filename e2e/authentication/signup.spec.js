import { test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../scripts/dts-import';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../scripts/constants';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath({ filePath: './e2e/data/without-admin.tar' });
    await page.goto('/admin');
  });

  test('a user should be able to signup when the strapi instance starts fresh', async ({
    page,
  }) => {
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

    await page.getByRole('button', { name: "Let's start" }).click();
  });
});
