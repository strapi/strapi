import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { AssetsPage } from './page-objects/AssetsPage';
import path from 'path';
import { describeOnCondition } from '../../../../utils/shared';

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - File Upload',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin.tar');
      await page.goto('/admin');
      await login({ page });
    });

    test('should upload a file and show progress dialog with success', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');

      // Upload the file via file picker
      await assetsPage.uploadFilesWithFilePicker(testImagePath);

      // Verify the upload progress dialog appears and shows success
      await expect(assetsPage.uploadProgressDialog).toBeVisible();
      await assetsPage.waitForUploadProgressSuccess();

      // Close the dialog
      await assetsPage.closeUploadProgressDialog();
      await expect(assetsPage.uploadProgressDialog).not.toBeVisible();
    });

    test('should upload multiple files and show progress dialog with success', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      const testFiles = [
        path.join(__dirname, '../../../data/uploads/test-image-1.jpg'),
        path.join(__dirname, '../../../data/uploads/test-image-2.jpg'),
      ];

      // Upload multiple files
      await assetsPage.uploadFilesWithFilePicker(testFiles);

      // Verify the upload progress dialog appears and shows success
      await expect(assetsPage.uploadProgressDialog).toBeVisible();
      await assetsPage.waitForUploadProgressSuccess();

      // Verify the success message mentions the count
      await expect(
        assetsPage.uploadProgressDialog.getByText('2 files uploaded successfully')
      ).toBeVisible();

      // Close the dialog
      await assetsPage.closeUploadProgressDialog();
    });

    test('should display uploaded file in the assets table view', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.switchToTableView();

      const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');

      // Upload the file
      await assetsPage.uploadFilesWithFilePicker(testImagePath);

      // Wait for upload to complete
      await assetsPage.waitForUploadProgressSuccess();
      await assetsPage.closeUploadProgressDialog();

      // Verify the uploaded file appears in the table
      const assetRow = assetsPage.getAssetRow('test-image');
      await expect(assetRow).toBeVisible();
    });

    test('should upload a file via drag and drop', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.switchToTableView();

      const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');

      // Upload the file via drag and drop
      await assetsPage.uploadFilesWithDragAndDrop(testImagePath);

      // Verify the upload progress dialog appears and shows success
      await expect(assetsPage.uploadProgressDialog).toBeVisible();
      await assetsPage.waitForUploadProgressSuccess();
      await assetsPage.closeUploadProgressDialog();

      // Verify the uploaded file appears in the table
      const assetRow = assetsPage.getAssetRow('test-image');
      await expect(assetRow).toBeVisible();
    });
  }
);
