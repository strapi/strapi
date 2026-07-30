import { test, expect } from '@playwright/test';
import path from 'path';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

const FIXTURE_IMAGE = path.join(__dirname, '../../../data/uploads/test-image.jpg');

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Drag and Drop Deep',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('moves a file onto a sidebar folder row', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Tree Destination');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.dragItemToTreeFolder('test-image.jpg', 'Tree Destination', 'table');

      await assetsPage.waitForMoveSuccess();
      await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();
    });

    test('spring-loads a collapsed sidebar folder and drops into a child', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Parent Folder');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.navigateIntoFolder('Parent Folder');
      await assetsPage.createFolder('Child Folder');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.getHomeTreeRow().click();
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.springLoadFolder('test-image.jpg', 'Parent Folder', 'table');
      await assetsPage.dropDraggedItemOn(assetsPage.getTreeFolderRow('Child Folder'));

      await assetsPage.waitForMoveSuccess();
      await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();
    });

    test('moves a nested item onto Home', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Nested Home Test');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.navigateIntoFolder('Nested Home Test');
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.dragItemToHome('test-image.jpg', 'table');

      await assetsPage.waitForMoveSuccess();
      await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();
    });

    test('does not move a folder onto one of its descendants in the tree', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Ancestor');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.navigateIntoFolder('Ancestor');
      await assetsPage.createFolder('Descendant');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.getHomeTreeRow().click();

      await assetsPage.switchToTableView();
      await assetsPage.springLoadFolder('Ancestor', 'Ancestor', 'table', 'folder');
      await assetsPage.dropDraggedItemOn(assetsPage.getTreeFolderRow('Descendant'));

      await expect(assetsPage.getFolderRow('Ancestor')).toBeVisible();
      await expect(assetsPage.getMoveSuccessNotification()).not.toBeVisible();
    });

    test('moves a mixed selection onto a sidebar folder and clears selection', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Multi Dest');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.createFolder('Selected Folder');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.switchToTableView();
      await assetsPage.selectFolder('Selected Folder');
      await assetsPage.selectAsset('test-image.jpg');

      await expect(assetsPage.getBulkActionsBar()).toBeVisible();

      await assetsPage.dragItemToTreeFolder('test-image.jpg', 'Multi Dest', 'table');

      await assetsPage.waitForMoveSuccess();
      await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();
      await expect(assetsPage.getFolderRow('Selected Folder')).not.toBeVisible();
      await expect(assetsPage.getBulkActionsBar()).not.toBeVisible();
    });
  }
);
