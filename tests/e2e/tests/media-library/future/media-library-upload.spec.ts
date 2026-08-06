import path from 'path';

import { test, expect, type Route } from '@playwright/test';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

/**
 * Journey 1 — Upload my assets (CMS-1066).
 *
 * A content manager fills an empty library through every upload path. Broad and
 * shallow: chains every capability once in a single flow rather than isolating
 * each one, per the journey's own framing in CMS-1066.
 */

const UPLOADS_DIR = path.join(__dirname, '../../../data/uploads');
const IMAGE = path.join(UPLOADS_DIR, 'test-image.jpg');
const IMAGE_1 = path.join(UPLOADS_DIR, 'test-image-1.jpg');
const IMAGE_2 = path.join(UPLOADS_DIR, 'test-image-2.jpg');
const BLOCKED_FILE = path.join(UPLOADS_DIR, 'blocked-file.exe');

// Every upload path funnels through the plugin's upload endpoints.
const UPLOAD_ROUTE = '**/upload/**';

describeOnCondition(process.env.BETA_MEDIA_LIBRARY === 'true')(
  'Media Library - Journey 1: Upload my assets',
  () => {
    test.describe.configure({ timeout: 600_000 });

    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('a content manager can upload assets through every path', async ({ page }) => {
      const assetsPage = new AssetsPage(page);

      await test.step('I land on the Media Library and choose a view', async () => {
        await assetsPage.goto();

        await assetsPage.switchToGridView();
        expect(await assetsPage.isGridViewActive()).toBe(true);

        // the choice persists across reload                     [CMS-109/110/111]
        await page.reload();
        expect(await assetsPage.isGridViewActive()).toBe(true);

        await assetsPage.switchToTableView();
      });

      await test.step('I upload a single file via the file picker', async () => {
        await assetsPage.uploadFilesWithFilePicker(IMAGE);
        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        await expect(assetsPage.getAssetRow('test-image')).toBeVisible();
      });

      await test.step('I upload multiple files and track per-file progress across navigation', async () => {
        await assetsPage.uploadFilesWithFilePicker([IMAGE_1, IMAGE_2]);
        await expect(assetsPage.uploadProgressDialog).toBeVisible();

        // the dialog persists while I navigate elsewhere in the admin  [CMS-107/1105].
        // Client-side navigation only: `page.goto()` is a full document load, which
        // tears down the SPA and the in-flight upload state along with it.
        await page.getByRole('link', { name: 'Content Manager' }).click();
        await page.waitForURL('**/admin/content-manager**');
        await expect(assetsPage.uploadProgressDialog).toBeVisible();

        await assetsPage.waitForUploadProgressSuccess();
        await expect(
          assetsPage.uploadProgressDialog.getByText('2 files uploaded successfully')
        ).toBeVisible();

        // progress is reported per file, not as one lump
        await expect(assetsPage.uploadProgressDialog.getByText('test-image-1.jpg')).toBeVisible();
        await expect(assetsPage.uploadProgressDialog.getByText('test-image-2.jpg')).toBeVisible();

        await assetsPage.closeUploadProgressDialog();

        // We asserted the dialog from the Content Manager; come back to the library
        // before the remaining upload paths, which need its dropzone and toolbar.
        await assetsPage.goto();
      });

      await test.step('I upload via drag and drop', async () => {
        await assetsPage.uploadFilesWithDragAndDrop(IMAGE);
        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();
      });

      await test.step('I upload from a URL', async () => {
        await assetsPage.uploadFilesFromUrl('https://picsum.photos/200');
        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();
      });

      await test.step('I cancel and retry an upload', async () => {
        // Hold the upload requests open so files are genuinely in flight when we
        // click Cancel. The fixtures are tiny: left at full speed the whole batch
        // completes before the click lands and there is nothing left to cancel,
        // which made this step pass or fail on machine speed alone.
        const holdUploads = async (route: Route) => {
          if (route.request().method() !== 'POST') {
            await route.continue().catch(() => {});
            return;
          }
          await new Promise((resolve) => {
            setTimeout(resolve, 4000);
          });
          // This step cancels mid-flight, so by the time the hold elapses the
          // request is often already aborted — continuing it then throws
          // "Route is already handled!" and fails the test from the handler.
          await route.continue().catch(() => {});
        };
        await page.route(UPLOAD_ROUTE, holdUploads);

        const batch = Array(5).fill(IMAGE);

        await assetsPage.uploadFilesWithFilePicker(batch);
        await expect(assetsPage.uploadProgressDialog).toBeVisible();

        await assetsPage.cancelUpload();
        // 'Uploads canceled' is the shipped copy (translations/en.json), not the
        // component's `defaultMessage`.
        await expect(assetsPage.uploadProgressDialog.getByText('Uploads canceled')).toBeVisible();

        // Release the throttle so the retry can actually finish.
        await page.unroute(UPLOAD_ROUTE, holdUploads);

        await assetsPage.retryCancelledUploads();
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();
      });

      await test.step('I am stopped from uploading unsupported types', async () => {
        // valid files in the same batch still upload                [CMS-249]
        await assetsPage.uploadFilesWithFilePicker([BLOCKED_FILE, IMAGE]);
        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await expect(
          assetsPage.uploadProgressDialog.getByText('1 uploaded, 1 failed')
        ).toBeVisible();
        await assetsPage.closeUploadProgressDialog();
      });

      await test.step('I bulk upload many files', async () => {
        // uploading > 20 files completes with no server crash        [CMS-358]
        const bigBatch = Array(25).fill(IMAGE);

        await assetsPage.uploadFilesWithFilePicker(bigBatch);
        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await assetsPage.waitForUploadProgressSuccess();
        await expect(
          assetsPage.uploadProgressDialog.getByText('25 files uploaded successfully')
        ).toBeVisible();
        await assetsPage.closeUploadProgressDialog();
      });

      // I upload files concurrently                                  [CMS-1111] (backlog)
      // Not shipped yet — nothing to assert until concurrency config lands.
    });
  }
);
