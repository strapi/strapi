import { test, expect } from '@playwright/test';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Crop & Rotate',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('rotates an image from the preview and persists it on save', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();
      await assetsPage.switchToGridView();
      await assetsPage.clickAssetInGrid('ted_lasso_profile.jpeg');
      await expect(assetsPage.assetDetailsDrawer).toBeVisible();

      // Save starts disabled; rotating marks the form dirty.
      const saveButton = assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Save' });
      await expect(saveButton).toBeDisabled();

      await assetsPage.rotateAssetFromDrawer();
      await expect(saveButton).toBeEnabled();

      await assetsPage.clickAssetDetailsDrawerSave();
      await assetsPage.waitForUploadSuccess();

      // Drawer stays open after a successful save.
      await expect(assetsPage.assetDetailsDrawer).toBeVisible();
    });

    test('crops an image and applies it to the original', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();
      await assetsPage.switchToGridView();
      await assetsPage.clickAssetInGrid('ted_lasso_profile.jpeg');
      await expect(assetsPage.assetDetailsDrawer).toBeVisible();

      await assetsPage.openCropEditor();
      // Default crop area = full image; Apply replaces the binary.
      await assetsPage.applyCrop();

      await expect(assetsPage.getDrawerToast(/File cropped/i)).toBeVisible({ timeout: 10000 });
      await expect(assetsPage.assetDetailsDrawer).toBeVisible();
    });

    test('crops an image and saves it as a copy in the same folder', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();
      await assetsPage.switchToGridView();
      await assetsPage.clickAssetInGrid('ted_lasso_profile.jpeg');
      await expect(assetsPage.assetDetailsDrawer).toBeVisible();

      await assetsPage.openCropEditor();
      await assetsPage.saveCropAsCopy();

      await expect(assetsPage.getDrawerToast(/Copy created/i)).toBeVisible({ timeout: 10000 });
    });
  }
);
