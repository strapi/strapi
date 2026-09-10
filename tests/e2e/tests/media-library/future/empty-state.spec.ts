import { test, expect, type APIRequestContext } from '@playwright/test';
import path from 'path';

import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../../constants';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

/**
 * Delete every media file through the upload API.
 *
 * The `with-admin` fixture ships nine files, so the library is never empty on its
 * own and the empty state can never render. Clearing it over the API rather than
 * through the UI keeps this spec independent of bulk delete working.
 */
const clearMediaLibrary = async (request: APIRequestContext) => {
  const auth = await request.post('/admin/login', {
    data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
  });
  const token = (await auth.json()).data?.token;
  expect(token, 'admin API login failed').toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };

  const listed = await request.get('/upload/files?pageSize=100', { headers });
  const files = (await listed.json())?.results ?? [];
  if (files.length === 0) return;

  const deleted = await request.post('/upload/actions/bulk-delete', {
    headers,
    data: { fileIds: files.map((file: { id: number }) => file.id) },
  });
  expect(deleted.ok(), 'bulk-delete failed').toBeTruthy();
};

const FIXTURE_IMAGE = path.join(__dirname, '../../../data/uploads/test-image.jpg');

describeOnCondition(process.env.BETA_MEDIA_LIBRARY === 'true')(
  'Media Library - Empty state',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('shows the empty state and uploads through the Add assets button', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await clearMediaLibrary(page.request);
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
