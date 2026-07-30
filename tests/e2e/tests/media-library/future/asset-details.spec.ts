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
      await resetDatabaseAndImportDataFromPath('with-admin');
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

    test('should edit file metadata and move the asset to a folder via the Location select', async ({
      page,
    }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      // Create a destination folder so the Location select has an option beyond
      // the Media Library root. Wait for the success toast and reload so the
      // assets list (cached by RTK Query) re-renders with the new folder.
      await assetsPage.createFolder('Coaching Staff');
      await assetsPage.waitForUploadSuccess();

      await assetsPage.goto();

      // Open the details drawer from the table view.
      await assetsPage.switchToTableView();
      await assetsPage.clickAssetInTable('ted_lasso_profile.jpeg');
      await expect(assetsPage.assetDetailsDrawer).toBeVisible();

      // Save should start disabled — nothing has changed yet.
      const saveButton = assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Save' });
      await expect(saveButton).toBeDisabled();

      // Edit File name and Alternative text.
      await assetsPage.fillAssetDetailsDrawerText('File name', 'head_coach_profile.jpeg');
      await assetsPage.fillAssetDetailsDrawerText('Alternative text', 'Head coach Ted Lasso');

      // Move the asset into the new folder via the Location select. The popover
      // renders in a Radix portal above the drawer (z-index dialog < popover).
      await assetsPage.selectAssetDetailsDrawerLocation('Coaching Staff');

      await expect(saveButton).toBeEnabled();
      await assetsPage.clickAssetDetailsDrawerSave();
      await assetsPage.waitForUploadSuccess();

      // Drawer stays open; assert the inputs reflect the persisted values after
      // the RTK Query refetch resolves.
      await expect(assetsPage.getAssetDetailsDrawerTextField('File name')).toHaveValue(
        'head_coach_profile.jpeg'
      );
      await expect(assetsPage.getAssetDetailsDrawerTextField('Alternative text')).toHaveValue(
        'Head coach Ted Lasso'
      );
      await expect(assetsPage.getAssetDetailsDrawerLocationSelect()).toContainText(
        'Coaching Staff'
      );

      // Close the drawer, navigate into the destination folder, and confirm the
      // renamed asset landed there. The original name should no longer appear
      // at the Media Library root.
      await assetsPage.closeAssetDetailsDrawer();
      await expect(assetsPage.assetDetailsDrawer).not.toBeVisible();

      await assetsPage.switchToGridView();
      await expect(assetsPage.getAssetCard('ted_lasso_profile.jpeg')).toHaveCount(0);

      await assetsPage.navigateIntoFolder('Coaching Staff');
      await expect(assetsPage.getAssetCard('head_coach_profile.jpeg')).toBeVisible();
    });

    test('should delete an asset from the drawer and remove it from the list', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      // Confirm the asset is in the list before deleting.
      await assetsPage.switchToGridView();
      await expect(assetsPage.getAssetCard('ted_lasso_profile.jpeg')).toBeVisible();

      await assetsPage.clickAssetInGrid('ted_lasso_profile.jpeg');
      await expect(assetsPage.assetDetailsDrawer).toBeVisible();

      await assetsPage.deleteAssetFromDrawer();

      // Drawer closes after a successful delete, success notification fires.
      await expect(assetsPage.assetDetailsDrawer).not.toBeVisible({ timeout: 5000 });
      await assetsPage.waitForUploadSuccess();

      // Asset is gone from the grid view.
      await expect(assetsPage.getAssetCard('ted_lasso_profile.jpeg')).toHaveCount(0);
    });

    test('should replace an asset binary from the drawer and refresh the details', async ({
      page,
    }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.switchToGridView();
      await assetsPage.clickAssetInGrid('ted_lasso_profile.jpeg');
      await expect(assetsPage.assetDetailsDrawer).toBeVisible();

      // Capture the original extension/size so we can compare after replace.
      const replacementPath = path.join(__dirname, '../../../data/uploads/test-image.jpg');
      await assetsPage.replaceAssetFromDrawer(replacementPath);

      // In-drawer toast confirms success — the drawer stays open and the
      // metadata refreshes via the RTK Query cache invalidation.
      await expect(assetsPage.getDrawerToast(/File replaced/i)).toBeVisible({ timeout: 10000 });

      // Drawer remains open after a successful replace.
      await expect(assetsPage.assetDetailsDrawer).toBeVisible();
    });
  }
);
