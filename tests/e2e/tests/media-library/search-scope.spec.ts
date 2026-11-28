import { test, expect } from '@playwright/test';
import path from 'path';

import { loginWithApi } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { describeOnCondition } from '../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

const ROOT_IMAGE = path.join(__dirname, '../../data/uploads/test-image-1.jpg');
const NESTED_IMAGE = path.join(__dirname, '../../data/uploads/test-image-2.jpg');

describeOnCondition(process.env.E2E_MEDIA_LIBRARY === 'current')(
  'Media Library - Search scope',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await loginWithApi({ page });
      await page.goto('/admin');
    });

    test('searches the current folder and its subfolders, or all media on demand', async ({
      page,
    }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();
      await assetsPage.switchToTableView();

      await test.step('one image at the root, one two folders down', async () => {
        await assetsPage.uploadFilesWithFilePicker(ROOT_IMAGE);
        await assetsPage.completeUpload();

        await assetsPage.createFolder('outer');
        await assetsPage.waitForNotification();
        await assetsPage.navigateIntoFolder('outer');

        await assetsPage.createFolder('inner');
        await assetsPage.waitForNotification();
        await assetsPage.navigateIntoFolder('inner');

        await assetsPage.uploadFilesWithFilePicker(NESTED_IMAGE);
        await assetsPage.completeUpload();

        await assetsPage.getTreeFolderRow('outer').click();
        await expect(page.getByRole('heading', { level: 1 })).toContainText('outer');
      });

      await test.step('a search inside a folder covers its subfolders only', async () => {
        await assetsPage.getSearchBox().fill('test-image');

        await expect(assetsPage.getAssetRow('test-image-2.jpg')).toBeVisible();
        await expect(assetsPage.getAssetRow('test-image-1.jpg')).not.toBeVisible();
        await expect(assetsPage.getSearchResultCount()).toHaveText('1 result');
        // The header keeps naming the folder being searched.
        await expect(page.getByRole('heading', { level: 1 })).toContainText('outer');
        await expect(assetsPage.getSearchAllSwitch()).not.toBeChecked();
      });

      await test.step('"Search all media" widens it to the whole library', async () => {
        await assetsPage.getSearchAllSwitch().click();

        await expect(page).toHaveURL(/searchAll=true/);
        await expect(assetsPage.getAssetRow('test-image-1.jpg')).toBeVisible();
        await expect(assetsPage.getAssetRow('test-image-2.jpg')).toBeVisible();
        await expect(assetsPage.getSearchResultCount()).toHaveText('2 results');
      });

      await test.step('opening another folder resets the search and the switch', async () => {
        await assetsPage.getHomeTreeRow().click();

        await expect(page).not.toHaveURL(/searchAll|_q=/);
        await expect(assetsPage.getSearchBox()).toHaveValue('');
        await expect(assetsPage.getSearchAllSwitch()).not.toBeVisible();
      });
    });
  }
);
