import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { AssetsPage } from './page-objects/AssetsPage';
import path from 'path';
import { describeOnCondition } from '../../../../utils/shared';

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Grid View',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin.tar');
      await page.goto('/admin');
      await login({ page });
    });

    test.describe('View Toggle', () => {
      test('should switch between grid and table views', async ({ page }) => {
        const assetsPage = new AssetsPage(page);
        await assetsPage.goto();

        // Switch to table view
        await assetsPage.switchToTableView();
        expect(await assetsPage.isGridViewActive()).toBe(false);

        // Switch back to grid view
        await assetsPage.switchToGridView();
        expect(await assetsPage.isGridViewActive()).toBe(true);
      });

      test('should persist view preference', async ({ page }) => {
        const assetsPage = new AssetsPage(page);
        await assetsPage.goto();

        // Switch to table view
        await assetsPage.switchToTableView();

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Should still be in table view
        expect(await assetsPage.isGridViewActive()).toBe(false);
      });
    });

    test.describe('Grid Display', () => {
      test('should display uploaded file as card in grid view', async ({ page }) => {
        const assetsPage = new AssetsPage(page);
        await assetsPage.goto();

        // Ensure we're in grid view
        await assetsPage.switchToGridView();
        expect(await assetsPage.isGridViewActive()).toBe(true);

        const testImagePath = path.join(__dirname, '../../../data/uploads/test-image.jpg');
        await assetsPage.uploadFilesWithFilePicker(testImagePath);
        await assetsPage.waitForUploadSuccess();

        // Verify asset appears as card
        const assetCard = assetsPage.getAssetCard('test-image');
        await expect(assetCard).toBeVisible();
      });
    });
  }
);
