import { test, expect } from '@playwright/test';
import path from 'path';

import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { describeOnCondition } from '../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

const FIXTURE_IMAGE = path.join(__dirname, '../../data/uploads/test-image.jpg');

describeOnCondition(process.env.E2E_MEDIA_LIBRARY === 'current')(
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
      await assetsPage.waitForNotification();
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.completeUpload();

      await assetsPage.switchToTableView();
      await assetsPage.dragItemToTreeFolder('test-image.jpg', 'Tree Destination', 'table');

      await assetsPage.waitForMoveSuccess();
      await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();
    });

    test('spring-loads a collapsed sidebar folder and drops into a child', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Parent Folder');
      await assetsPage.waitForNotification();
      await assetsPage.navigateIntoFolder('Parent Folder');
      await assetsPage.createFolder('Child Folder');
      await assetsPage.waitForNotification();
      await assetsPage.getHomeTreeRow().click();
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.completeUpload();

      await assetsPage.switchToTableView();
      await assetsPage.springLoadFolder('test-image.jpg', 'Parent Folder', 'table');
      await assetsPage.dropDraggedItemOn(assetsPage.getTreeFolderRow('Child Folder'));

      await assetsPage.waitForMoveSuccess();
      await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();
    });

    test('drops into a folder hidden by a deep branch', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      // Depth 4 is the first level whose branch folds: Depth 1 → 2 hide behind
      // the summary row, Depth 3 stays visible as the open folder's parent.
      for (const name of ['Depth 0', 'Depth 1', 'Depth 2', 'Depth 3', 'Depth 4']) {
        await assetsPage.createFolder(name);
        await assetsPage.waitForNotification();
        await assetsPage.navigateIntoFolder(name);
      }
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.completeUpload();

      const summaryRow = assetsPage.getTreeHiddenAncestorsRow();
      await expect(summaryRow).toHaveAttribute('aria-expanded', 'false');
      await expect(assetsPage.getTreeFolderRow('Depth 1')).not.toBeVisible();

      await assetsPage.switchToTableView();
      await assetsPage.springLoadOnto('test-image.jpg', summaryRow);
      await expect(summaryRow).toHaveAttribute('aria-expanded', 'true');
      await assetsPage.dropDraggedItemOn(assetsPage.getTreeFolderRow('Depth 1'));

      await assetsPage.waitForMoveSuccess();
      await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();

      await assetsPage.getHomeTreeRow().click();
      await assetsPage.navigateIntoFolder('Depth 0');
      await assetsPage.navigateIntoFolder('Depth 1');
      await expect(assetsPage.getListItem('test-image.jpg')).toBeVisible();
    });

    test('moves a nested item onto Home', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Nested Home Test');
      await assetsPage.waitForNotification();
      await assetsPage.navigateIntoFolder('Nested Home Test');
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.completeUpload();

      await assetsPage.switchToTableView();
      await assetsPage.dragItemToHome('test-image.jpg', 'table');

      await assetsPage.waitForMoveSuccess();
      await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();
    });

    test('does not move a folder onto one of its descendants in the tree', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Ancestor');
      await assetsPage.waitForNotification();
      await assetsPage.navigateIntoFolder('Ancestor');
      await assetsPage.createFolder('Descendant');
      await assetsPage.waitForNotification();
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
      await assetsPage.waitForNotification();
      await assetsPage.createFolder('Selected Folder');
      await assetsPage.waitForNotification();
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE);
      await assetsPage.completeUpload();

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
