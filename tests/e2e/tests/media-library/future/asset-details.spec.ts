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

    test('should open drawer and display file info when clicking an asset', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      // Table view
      await assetsPage.switchToTableView();
      await assetsPage.clickAssetInTable('ted_lasso_profile.jpeg');

      await expect(assetsPage.assetDetailsDrawer).toBeVisible();
      await expect(assetsPage.assetDetailsDrawer.getByText('File info').first()).toBeVisible();
      await expect(assetsPage.assetDetailsDrawer.getByText('ted_lasso_profile.jpeg')).toBeVisible();

      // Close the drawer
      await assetsPage.closeAssetDetailsDrawer();
      await expect(assetsPage.assetDetailsDrawer).not.toBeVisible();

      // Grid view
      await assetsPage.switchToGridView();
      const assetCard = assetsPage.getAssetCard('coach_beard_profile.jpg');
      await expect(assetCard).toBeVisible();
      await assetCard.click();

      await expect(assetsPage.assetDetailsDrawer).toBeVisible();
      await expect(assetsPage.assetDetailsDrawer.getByText('File info').first()).toBeVisible();
      await expect(
        assetsPage.assetDetailsDrawer.getByText('coach_beard_profile.jpg')
      ).toBeVisible();
    });
  }
);
