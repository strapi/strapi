import { test, expect } from '@playwright/test';
import path from 'path';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

const FIXTURE_IMAGE_1 = path.join(__dirname, '../../../data/uploads/test-image-1.jpg');
const FIXTURE_IMAGE_2 = path.join(__dirname, '../../../data/uploads/test-image-2.jpg');

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Bulk delete',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('deletes the selected assets from the bulk action bar', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.uploadFilesWithFilePicker([FIXTURE_IMAGE_1, FIXTURE_IMAGE_2]);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.selectAsset('test-image-1.jpg');
      await assetsPage.selectAsset('test-image-2.jpg');

      await expect(assetsPage.getBulkActionsBar()).toBeVisible();
      await expect(assetsPage.getBulkActionsBar()).toContainText('2 items selected');

      await assetsPage.bulkDeleteSelection();

      // Assets gone from the list, selection cleared → bar hidden.
      await expect(assetsPage.getAssetRow('test-image-1.jpg')).not.toBeVisible();
      await expect(assetsPage.getAssetRow('test-image-2.jpg')).not.toBeVisible();
      await expect(assetsPage.getBulkActionsBar()).not.toBeVisible();
    });

    test('deletes a selected folder (and its contents) from the bulk action bar', async ({
      page,
    }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Doomed');
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.selectAsset('Doomed');

      await expect(assetsPage.getBulkActionsBar()).toContainText('1 item selected');

      await assetsPage.bulkDeleteSelection();

      await expect(assetsPage.getFolderRow('Doomed')).not.toBeVisible();
      await expect(assetsPage.getBulkActionsBar()).not.toBeVisible();
    });

    test('cancelling the confirm dialog keeps the assets and the selection', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE_1);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.selectAsset('test-image-1.jpg');

      await assetsPage.getBulkActionsBar().getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByText('Delete 1 item?')).toBeVisible();

      await page.getByRole('button', { name: 'Cancel' }).click();

      await expect(assetsPage.getAssetRow('test-image-1.jpg')).toBeVisible();
      await expect(assetsPage.getBulkActionsBar()).toBeVisible();
    });
  }
);
