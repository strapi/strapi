import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { MediaLibraryPage } from './page-objects/MediaLibraryPage';
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
      const mediaLibrary = new MediaLibraryPage(page);
      await mediaLibrary.goto();

      // Create a test image file path
      const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');

      // Upload the file via file picker and verify the picker opens
      const fileChooser = await mediaLibrary.uploadFilesWithFilePicker(testImagePath);

      // Verify the file chooser accepts multiple files
      expect(fileChooser.isMultiple()).toBe(true);

      // Wait for and verify success notification
      await mediaLibrary.waitForUploadSuccess();
      const successMessage = await mediaLibrary.getSuccessMessage();
      expect(successMessage).toContain('uploaded successfully');
    });

    test('should upload multiple files using the file picker', async ({ page }) => {
      const mediaLibrary = new MediaLibraryPage(page);
      await mediaLibrary.goto();

      // Create test file paths
      const testFiles = [
        path.join(__dirname, '../../../data/uploads/test-image-1.jpg'),
        path.join(__dirname, '../../../data/uploads/test-image-2.jpg'),
      ];

      // Upload multiple files
      await mediaLibrary.uploadFilesWithFilePicker(testFiles);

      // Wait for and verify success notification
      await mediaLibrary.waitForUploadSuccess();
      const successMessage = await mediaLibrary.getSuccessMessage();
      // Check for key parts of the message to be more resilient to translation/formatting changes
      expect(successMessage).toContain('2');
      expect(successMessage).toContain('uploaded successfully');
    });

    test('should reset file input after upload', async ({ page }) => {
      const mediaLibrary = new MediaLibraryPage(page);
      await mediaLibrary.goto();

      const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');

      // Upload a file
      await mediaLibrary.uploadFilesWithFilePicker(testImagePath);
      await mediaLibrary.waitForUploadSuccess();

      // Verify the file input is reset (value should be empty)
      const isReset = await mediaLibrary.isFileInputReset();
      expect(isReset).toBe(true);
    });
  }
);
