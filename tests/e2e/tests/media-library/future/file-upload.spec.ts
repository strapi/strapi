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

    test('should upload a single image file using the file picker', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      // Create a test image file path
      const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');

      // Upload the file via file picker and verify the picker opens
      const fileChooser = await assetsPage.uploadFilesWithFilePicker(testImagePath);

      // Verify the file chooser accepts multiple files
      expect(fileChooser.isMultiple()).toBe(true);

      // Wait for and verify success notification
      await assetsPage.waitForUploadSuccess();
      const successMessage = await assetsPage.getSuccessMessage();
      expect(successMessage).toContain('uploaded successfully');
    });

    test('should upload multiple files using the file picker', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      // Create test file paths
      const testFiles = [
        path.join(__dirname, '../../../data/uploads/test-image-1.jpg'),
        path.join(__dirname, '../../../data/uploads/test-image-2.jpg'),
      ];

      // Upload multiple files
      await assetsPage.uploadFilesWithFilePicker(testFiles);

      // Wait for and verify success notification
      await assetsPage.waitForUploadSuccess();
      const successMessage = await assetsPage.getSuccessMessage();
      // Check for key parts of the message to be more resilient to translation/formatting changes
      expect(successMessage).toContain('2');
      expect(successMessage).toContain('uploaded successfully');
    });

    test('should reset file input after upload', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');

      // Upload a file
      await assetsPage.uploadFilesWithFilePicker(testImagePath);
      await assetsPage.waitForUploadSuccess();

      // Verify the file input is reset (value should be empty)
      const isReset = await assetsPage.isFileInputReset();
      expect(isReset).toBe(true);
    });

    test('should display uploaded file in the assets list', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');

      // Upload the file
      await assetsPage.uploadFilesWithFilePicker(testImagePath);
      await assetsPage.waitForUploadSuccess();

      // Verify the uploaded file appears in the list
      const assetRow = assetsPage.getAssetRow('test-image');
      await expect(assetRow).toBeVisible();
    });
  }
);
