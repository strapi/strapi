/**
 * THIS IS A DUMMY TEST.
 */
import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';

test.describe('List View', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('A user should be able to navigate to the ListView of the content manager and see some entries', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Content Manager' }).click();

    await expect(page).toHaveTitle('Content Manager');
    await expect(page.getByRole('heading', { name: 'testing' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Create new entry/ })).toBeVisible();
  });
});
