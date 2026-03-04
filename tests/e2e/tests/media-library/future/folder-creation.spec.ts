import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { AssetsPage } from './page-objects/AssetsPage';
import { describeOnCondition } from '../../../../utils/shared';

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Folder Creation',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin.tar');
      await page.goto('/admin');
      await login({ page });
    });

    test('should create a folder from the root', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.openCreateFolderDialog();
      await expect(assetsPage.createFolderDialog).toBeVisible();
      await expect(assetsPage.createFolderDialog.getByText('New folder in Home')).toBeVisible();

      await assetsPage.createFolderDialog.getByRole('textbox').fill('Test Folder');
      await assetsPage.createFolderDialog.getByRole('button', { name: /create folder/i }).click();

      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToGridView();
      await expect(assetsPage.getFolderCard('Test Folder')).toBeVisible();
    });

    test('should create a subfolder inside an existing folder', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      // Create a parent folder first
      await assetsPage.createFolder('Parent Folder');
      await assetsPage.waitForUploadSuccess();

      // Navigate into the parent folder
      await assetsPage.switchToGridView();
      await assetsPage.navigateIntoFolder('Parent Folder');

      // Dialog title should reflect the parent folder name
      await assetsPage.openCreateFolderDialog();
      await expect(assetsPage.createFolderDialog).toBeVisible();
      await expect(
        assetsPage.createFolderDialog.getByText('New folder in Parent Folder')
      ).toBeVisible();

      // Create a subfolder
      await assetsPage.createFolderDialog.getByRole('textbox').fill('Sub Folder');
      await assetsPage.createFolderDialog.getByRole('button', { name: /create folder/i }).click();

      await assetsPage.waitForUploadSuccess();

      await expect(assetsPage.getFolderCard('Sub Folder')).toBeVisible();
    });

    test('should cancel folder creation', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.openCreateFolderDialog();
      await expect(assetsPage.createFolderDialog).toBeVisible();
      await assetsPage.createFolderDialog.getByRole('textbox').fill('Cancelled Folder');

      await assetsPage.createFolderDialog.getByRole('button', { name: /cancel/i }).click();

      await expect(assetsPage.createFolderDialog).not.toBeVisible();
      await expect(page.getByText('Cancelled Folder')).not.toBeVisible();
    });

    test('should show inline error for duplicate folder name', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      // Create a folder named "Duplicate"
      await assetsPage.createFolder('Duplicate');
      await assetsPage.waitForUploadSuccess();

      // Try to create another folder with the same name
      await assetsPage.openCreateFolderDialog();
      await assetsPage.createFolderDialog.getByRole('textbox').fill('Duplicate');
      await assetsPage.createFolderDialog.getByRole('button', { name: /create folder/i }).click();

      // Inline error should appear below the input
      await expect(assetsPage.createFolderDialog.getByText(/already exists/i)).toBeVisible();
    });

    test('should reset form when dialog is reopened', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      // Open dialog, type a name, then cancel
      await assetsPage.openCreateFolderDialog();
      await assetsPage.createFolderDialog.getByRole('textbox').fill('Some Folder');
      await assetsPage.createFolderDialog.getByRole('button', { name: /cancel/i }).click();

      // Reopen — input should be empty, no error visible
      await assetsPage.openCreateFolderDialog();
      await expect(assetsPage.createFolderDialog.getByRole('textbox')).toHaveValue('');
      await expect(assetsPage.createFolderDialog.getByRole('alert')).not.toBeVisible();
    });
  }
);
