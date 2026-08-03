import { test, expect } from '@playwright/test';
import path from 'path';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

const FIXTURE_IMAGE_1 = path.join(__dirname, '../../../data/uploads/test-image-1.jpg');

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Filters',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('filters by type and hides folders for non-folder values', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('a-folder');
      await assetsPage.waitForUploadSuccess();
      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE_1);
      await assetsPage.waitForUploadSuccess();
      await assetsPage.switchToTableView();

      // Type is Picture: the image stays, the folder section disappears.
      await assetsPage.pickFilterOption('Type', 'Picture');

      await expect(assetsPage.getFilterBadges()).toHaveCount(1);
      await expect(assetsPage.getFilterBadges().first()).toContainText('Type');
      await expect(assetsPage.getAssetRow('test-image-1.jpg')).toBeVisible();
      await expect(page.getByText('a-folder')).not.toBeVisible();

      // Removing the badge restores the folder.
      await assetsPage.removeFilterBadge('Type');
      await expect(page.getByText('a-folder')).toBeVisible();
    });

    test('date preset filter excludes fresh uploads with "not within the last"', async ({
      page,
    }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE_1);
      await assetsPage.waitForUploadSuccess();
      await assetsPage.switchToTableView();

      // Just-uploaded asset is within the last week → visible.
      await assetsPage.pickFilterOption('Creation date', '1 week ago');
      await expect(assetsPage.getAssetRow('test-image-1.jpg')).toBeVisible();

      // Flip the condition on the badge to "not within the last" → filtered empty state.
      await assetsPage.getFilterBadges().getByRole('button', { name: 'within the last' }).click();
      await page.getByRole('button', { name: 'not within the last' }).click();

      await expect(page.getByText('No items matched current filters')).toBeVisible();

      // Clear filters brings everything back.
      await page.getByRole('button', { name: 'Clear filters' }).click();
      await expect(assetsPage.getAssetRow('test-image-1.jpg')).toBeVisible();
    });

    test('restores filters from the URL after a reload', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE_1);
      await assetsPage.waitForUploadSuccess();

      await assetsPage.pickFilterOption('Creation date', '1 week ago');
      await expect(page).toHaveURL(/filters=/);

      await page.reload();

      await expect(assetsPage.getFilterBadges()).toHaveCount(1);
      await expect(assetsPage.getFilterBadges().first()).toContainText('1 week ago');
    });
  }
);
