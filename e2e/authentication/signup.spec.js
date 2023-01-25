import { test } from '@playwright/test';
// eslint-disable-next-line import/extensions
import { resetDatabaseAndImportDataFromPath } from '../scripts/data-transfer';

test.describe('Sign Up', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/backup.tar');
    await page.goto('/admin');
  });

  test('a user should be able to signup when the strapi instance starts fresh', async ({
    page,
  }) => {
    await page.getByLabel('First name').fill('John');
    await page.getByLabel('Last name').fill('Smith');
    await page.getByLabel('Email').fill('test@testing.com');
    await page
      .getByLabel('Password*', {
        exact: true,
      })
      .fill('myTestPassw0rd');
    await page
      .getByLabel('Confirm Password*', {
        exact: true,
      })
      .fill('myTestPassw0rd');

    await page.getByRole('button', { name: "Let's start" }).click();
  });
});
