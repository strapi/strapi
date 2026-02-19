import { test, expect } from '@playwright/test';
import path from 'path';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Asset Details Drawer',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin.tar');
      await page.goto('/admin');
      await login({ page });
    });

    test.describe('Table view', () => {
      test('should open drawer and display correct file info when clicking an asset', async ({
        page,
      }) => {
        const assetsPage = new AssetsPage(page);
        await assetsPage.goto();
        await assetsPage.switchToTableView();

        const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');
        await assetsPage.uploadFilesWithFilePicker(testImagePath);
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        // Click the asset to open the details drawer
        await assetsPage.clickAssetInTable('test-image');

        // Verify the drawer is visible
        await expect(assetsPage.assetDetailsDrawer).toBeVisible();

        // Verify File info section
        await expect(assetsPage.assetDetailsDrawer.getByText('File info').first()).toBeVisible();

        // Verify file name in header
        await expect(assetsPage.assetDetailsDrawer.getByText('test-image.jpg')).toBeVisible();

        // Verify File name field
        await expect(assetsPage.assetDetailsDrawer.getByLabel('File name')).toBeVisible();

        // Verify Extension is displayed (.jpg)
        const extensionValue = assetsPage.getDrawerDetailValue('Extension');
        await expect(extensionValue).toContainText('jpg');

        // Verify Asset ID is displayed (numeric)
        const assetIdValue = assetsPage.getDrawerDetailValue('Asset ID');
        await expect(assetIdValue).toHaveText(/\d+/);

        // Verify Size is displayed
        const sizeValue = assetsPage.getDrawerDetailValue('Size');
        await expect(sizeValue).toHaveText('100B');

        // Wait for image to load - loader disappears when media is ready
        await expect(assetsPage.assetDetailsDrawer.getByText('Loading...')).not.toBeVisible({
          timeout: 5000,
        });

        // Verify the preview image is displayed
        const previewImage = assetsPage.assetDetailsDrawer.locator('img');
        await expect(previewImage).toBeVisible();

        // Close the drawer
        await assetsPage.closeAssetDetailsDrawer();
        await expect(assetsPage.assetDetailsDrawer).not.toBeVisible();
      });
    });

    test.describe('Grid view', () => {
      test('should open drawer and display file info when clicking an asset card', async ({
        page,
      }) => {
        const assetsPage = new AssetsPage(page);
        await assetsPage.goto();
        await assetsPage.switchToGridView();

        const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');
        await assetsPage.uploadFilesWithFilePicker(testImagePath);
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        const assetCard = assetsPage.getAssetCard('test-image');
        await expect(assetCard).toBeVisible();
        await assetCard.click();

        await expect(assetsPage.assetDetailsDrawer).toBeVisible();
        await expect(assetsPage.assetDetailsDrawer.getByText('File info').first()).toBeVisible();
        await expect(assetsPage.assetDetailsDrawer.getByText('test-image.jpg')).toBeVisible();
      });
    });
  }
);
