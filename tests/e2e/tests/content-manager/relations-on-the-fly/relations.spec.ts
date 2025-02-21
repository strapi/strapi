import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';

test.describe('Relations on the fly tests', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });
  test.describe('Edit Modal', () => {
    test('as a user I want to open a relation modal inside a collection', async ({ page }) => {
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Author' }).click();
      await page.getByRole('gridcell', { name: 'Ted Lasso' }).click();

      await expect(page.getByRole('heading', { name: 'Ted Lasso' })).toBeVisible();

      await page.getByRole('button', { name: 'Pourquoi je préfère le' }).click();
      // it opens the edit relations modal
      await expect(page.getByText('Edit a relation')).toBeVisible();
    });
  });
});
