import { test, expect } from '@playwright/test';
import path from 'path';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

const FIXTURE_IMAGE = path.join(__dirname, '../../../data/uploads/test-image.jpg');

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Drag and Drop Shallow',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('moves a file onto a folder in table view', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Destination');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.dragItemToFolder('test-image.jpg', 'Destination', 'table');

      await assetsPage.waitForUploadSuccess();
      await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();
      await expect(assetsPage.getFolderRow('Destination')).toBeVisible();
    });

    test('moves a file onto a folder in grid view', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Grid Destination');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToGridView();
      await assetsPage.dragItemToFolder('test-image.jpg', 'Grid Destination', 'grid');

      await assetsPage.waitForUploadSuccess();
      await expect(assetsPage.getAssetCard('test-image.jpg')).not.toBeVisible();
    });

    test('moves a folder onto another folder in table view', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Target Folder');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.createFolder('Movable Folder');
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.dragItemToFolder('Movable Folder', 'Target Folder', 'table', 'folder');

      await assetsPage.waitForUploadSuccess();
      await expect(assetsPage.getFolderRow('Movable Folder')).not.toBeVisible();
    });

    test('moves a folder onto another folder in grid view', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Grid Target');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.createFolder('Grid Movable');
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToGridView();
      await assetsPage.dragItemToFolder('Grid Movable', 'Grid Target', 'grid', 'folder');

      await assetsPage.waitForUploadSuccess();
      await expect(assetsPage.getFolderCard('Grid Movable')).not.toBeVisible();
    });

    test('does not move a folder when dropped onto itself', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Self Folder');
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.dragFolderToSelf('Self Folder', 'table');

      await expect(assetsPage.getFolderRow('Self Folder')).toBeVisible();
      await expect(page.getByText('Elements have been moved successfully')).not.toBeVisible();
    });

    test('shows success toast and removes item from current view after drop', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Toast Target');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToGridView();
      await assetsPage.dragItemToFolder('test-image.jpg', 'Toast Target', 'grid');

      await expect(page.getByText('Elements have been moved successfully')).toBeVisible();
      await expect(assetsPage.getAssetCard('test-image.jpg')).not.toBeVisible();
    });
  }
);
