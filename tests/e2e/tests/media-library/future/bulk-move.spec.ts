import { test, expect } from '@playwright/test';
import path from 'path';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

const FIXTURE_IMAGE_1 = path.join(__dirname, '../../../data/uploads/test-image-1.jpg');
const FIXTURE_IMAGE_2 = path.join(__dirname, '../../../data/uploads/test-image-2.jpg');

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Bulk move',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('moves the selected assets into a folder from the bulk action bar', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Marketing team');
      await assetsPage.uploadFilesWithFilePicker([FIXTURE_IMAGE_1, FIXTURE_IMAGE_2]);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.selectAsset('test-image-1.jpg');
      await assetsPage.selectAsset('test-image-2.jpg');

      await expect(assetsPage.getBulkActionsBar()).toContainText('2 items selected');

      await assetsPage.bulkMoveSelectionTo('Marketing team');

      await expect(
        page.getByText('2 elements have been moved from Media Library to Marketing team')
      ).toBeVisible();

      // Assets left the current (root) list, selection cleared → bar hidden.
      await expect(assetsPage.getAssetRow('test-image-1.jpg')).not.toBeVisible();
      await expect(assetsPage.getAssetRow('test-image-2.jpg')).not.toBeVisible();
      await expect(assetsPage.getBulkActionsBar()).not.toBeVisible();

      // The assets are inside the destination folder.
      await assetsPage.navigateIntoFolder('Marketing team');
      await expect(assetsPage.getAssetRow('test-image-1.jpg')).toBeVisible();
      await expect(assetsPage.getAssetRow('test-image-2.jpg')).toBeVisible();
    });

    test('moves a selected folder and updates the sidebar folder tree', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Destination');
      await assetsPage.createFolder('Nomad');

      await assetsPage.switchToTableView();
      await assetsPage.selectAsset('Nomad');

      await assetsPage.bulkMoveSelectionTo('Destination');

      // The folder left the root list.
      await expect(assetsPage.getFolderRow('Nomad')).not.toBeVisible();

      // The sidebar tree reflects the new hierarchy: Nomad nests under Destination.
      const sidebar = page.getByRole('navigation', { name: 'Media library folders' });
      await sidebar.getByRole('button', { name: 'Expand Destination' }).click();
      await expect(sidebar.getByRole('button', { name: 'Nomad', exact: true })).toBeVisible();
    });

    test('cancelling the move dialog keeps the assets and the selection', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE_1);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.selectAsset('test-image-1.jpg');

      await assetsPage.getBulkActionsBar().getByRole('button', { name: 'Move' }).click();
      await expect(page.getByRole('dialog', { name: 'Move elements to' })).toBeVisible();

      await page.getByRole('button', { name: 'Cancel' }).click();

      await expect(page.getByRole('dialog', { name: 'Move elements to' })).not.toBeVisible();
      await expect(assetsPage.getAssetRow('test-image-1.jpg')).toBeVisible();
      await expect(assetsPage.getBulkActionsBar()).toBeVisible();
    });
  }
);
