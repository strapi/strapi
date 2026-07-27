import { test, expect } from '@playwright/test';
import path from 'path';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

const FIXTURE_IMAGE = path.join(__dirname, '../../../data/uploads/test-image.jpg');

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Empty state',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('shows the empty state and uploads through the Add assets button', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      // Fresh library: designed empty state instead of a bare message.
      await expect(page.getByText('No assets yet')).toBeVisible();
      await expect(
        page.getByText('Get started by uploading assets or creating a folder.')
      ).toBeVisible();

      // "Add assets" opens the same file picker as New > File upload.
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Add assets' }).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(FIXTURE_IMAGE);

      await assetsPage.waitForUploadProgressSuccess();
      await assetsPage.closeUploadProgressDialog();

      // Content present → empty state gone.
      await expect(page.getByText('No assets yet')).not.toBeVisible();
      await expect(page.getByText('test-image.jpg').first()).toBeVisible();
    });

    test('shows the empty state inside an empty folder', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Empty folder');
      await assetsPage.navigateIntoFolder('Empty folder');

      await expect(page.getByText('No assets yet')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add assets' })).toBeVisible();
    });
  }
);
