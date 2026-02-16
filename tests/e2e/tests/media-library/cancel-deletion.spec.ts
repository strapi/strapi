import { test, expect } from '@playwright/test';
import path from 'path';

import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { resetFiles } from '../../../utils/file-reset';
import { login } from '../../../utils/login';
import { navToHeader } from '../../../utils/shared';

test.describe('Media Library', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await resetFiles();
    await page.goto('/admin');
    await login({ page });
  });

  // Regression test for https://github.com/strapi/strapi/issues/25190
  // Cancel button in media delete confirmation must not delete the asset
  test.describe('Cancel deletion', () => {
    test('as a user I want to cancel the remove-asset confirmation without deleting the asset', async ({
      page,
    }) => {
      await navToHeader(page, ['Media Library'], 'Media Library');

      // Upload one asset so we have something to open and attempt to delete
      await page.getByRole('button', { name: 'Add new assets' }).first().click();
      await expect(
        page.getByRole('dialog').getByRole('heading', { name: 'Add new assets' })
      ).toBeVisible();

      const fileInput = page.getByRole('dialog').locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, '../../data/uploads/test-image.jpg'));

      await page
        .getByRole('button', {
          name: 'Upload 1 asset to the library',
        })
        .click();

      // Stable media library does not show a toast on upload success; the dialog just closes
      await expect(
        page.getByRole('dialog').getByRole('heading', { name: 'Add new assets' })
      ).not.toBeVisible({ timeout: 15000 });

      // Open the first asset (the one we just uploaded) by clicking its card
      await expect(page.getByRole('button', { name: 'test-image.jpg' })).toBeVisible({
        timeout: 10000,
      });
      await page.getByRole('button', { name: 'test-image.jpg' }).first().click();

      // Edit dialog (Details) should be open with Delete button
      const editDialog = page.getByRole('dialog').filter({ hasText: 'Details' });
      await expect(editDialog).toBeVisible();
      const deleteButton = editDialog.getByRole('button', { name: 'Delete' });
      await expect(deleteButton).toBeVisible();

      // Open the remove-asset confirmation dialog
      await deleteButton.click();

      // Confirmation content appears ("Are you sure?" body text); Confirm button is unique to this dialog
      await expect(page.getByText('Are you sure?')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();

      // Click Cancel in the confirmation (footer contains both Cancel and Confirm)
      const confirmFooter = page.getByRole('button', { name: 'Confirm' }).locator('../..');
      await confirmFooter.getByRole('button', { name: 'Cancel' }).click();

      // Confirmation content should disappear
      await expect(page.getByText('Are you sure?')).not.toBeVisible();

      // Edit dialog should still be open and Delete button still visible (asset not deleted)
      await expect(editDialog).toBeVisible();
      await expect(deleteButton).toBeVisible();
    });
  });
});
