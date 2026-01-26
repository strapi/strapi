import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { MediaLibraryPage } from './page-objects/MediaLibraryPage';
import path from 'path';

test.describe('Media Library - File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('should upload a single image file', async ({ page }) => {
    const mediaLibrary = new MediaLibraryPage(page);
    await mediaLibrary.goto();

    // Create a test image file path
    const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');

    // Upload the file
    await mediaLibrary.uploadFiles(testImagePath);

    // Wait for and verify success notification
    await mediaLibrary.waitForUploadSuccess();
    const successMessage = await mediaLibrary.getSuccessMessage();
    expect(successMessage).toContain('uploaded successfully');
  });

  test('should upload multiple files', async ({ page }) => {
    const mediaLibrary = new MediaLibraryPage(page);
    await mediaLibrary.goto();

    // Create test file paths
    const testFiles = [
      path.join(__dirname, '../../../data/uploads/test-image-1.jpg'),
      path.join(__dirname, '../../../data/uploads/test-image-2.jpg'),
    ];

    // Upload multiple files
    await mediaLibrary.uploadFiles(testFiles);

    // Wait for and verify success notification
    await mediaLibrary.waitForUploadSuccess();
    const successMessage = await mediaLibrary.getSuccessMessage();
    expect(successMessage).toContain('2 assets uploaded successfully');
  });

  test('should show the import files menu item with icon', async ({ page }) => {
    const mediaLibrary = new MediaLibraryPage(page);
    await mediaLibrary.goto();

    // Open the New menu
    await mediaLibrary.openNewMenu();

    // Verify the Import files menu item is visible
    await expect(mediaLibrary.importFilesMenuItem).toBeVisible();

    // Verify the menu item has the Files icon (you can check for the icon by checking if svg exists)
    const menuItemWithIcon = page.getByRole('menuitem', { name: 'Import files' }).locator('svg');
    await expect(menuItemWithIcon).toBeVisible();
  });

  test('should reset file input after upload', async ({ page }) => {
    const mediaLibrary = new MediaLibraryPage(page);
    await mediaLibrary.goto();

    const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');

    // Upload the same file twice
    await mediaLibrary.uploadFiles(testImagePath);
    await mediaLibrary.waitForUploadSuccess();

    // Upload the same file again - this should work because the input is reset
    await mediaLibrary.uploadFiles(testImagePath);
    await mediaLibrary.waitForUploadSuccess();

    // Verify both uploads were successful
    const successMessage = await mediaLibrary.getSuccessMessage();
    expect(successMessage).toContain('uploaded successfully');
  });
});
