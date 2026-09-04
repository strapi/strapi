import path from 'path';

import { test, expect, type Route, type APIRequestContext } from '@playwright/test';

import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../../constants';
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

// How long each upload request is held open when a step needs files to still be in
// flight. Deliberate knob, not a sleep: the fixtures are tiny, so at full speed a
// batch finishes before the next click lands.
const UPLOAD_HOLD_MS = 4_000;

/**
 * How many files the library holds, straight from the API.
 *
 * The table is paginated, so counting rows only ever sees the first page — it
 * cannot tell you whether a 25-file batch actually landed.
 */
const countAssets = async (request: APIRequestContext) => {
  const auth = await request.post('/admin/login', {
    data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
  });
  const token = (await auth.json())?.data?.token;
  expect(token, 'admin API login failed').toBeTruthy();
  const listed = await request.get('/upload/files?pageSize=1', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await listed.json())?.pagination?.total ?? 0;
};

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

      // Shared by the two steps that need uploads to still be running.
      const holdUploads = async (route: Route) => {
        if (route.request().method() !== 'POST') {
          await route.continue().catch(() => {});
          return;
        }
        await new Promise((resolve) => {
          setTimeout(resolve, UPLOAD_HOLD_MS);
        });
        // The cancel step aborts mid-flight, so the request is often already gone
        // by the time the hold elapses; continuing it then throws.
        await route.continue().catch(() => {});
      };

      await test.step('I land on the Media Library and choose a view', async () => {
        await assetsPage.goto();

        // The three things the journey says are on screen when you land.
        await expect(assetsPage.newButton).toBeVisible();
        await expect(assetsPage.getFilterMenuTrigger()).toBeVisible();
        await expect(page.getByTestId('folder-tree-home')).toBeVisible();

        await assetsPage.switchToGridView();
        expect(await assetsPage.isGridViewActive()).toBe(true);

        // the choice persists across reload
        await page.reload();
        expect(await assetsPage.isGridViewActive()).toBe(true);

        // and so does the other one — this is the view the rest of the test runs in.
        await assetsPage.switchToTableView();
        await page.reload();
        expect(await assetsPage.isGridViewActive()).toBe(false);
      });

      await test.step('I upload a single file via the file picker', async () => {
        await assetsPage.uploadFilesWithFilePicker(IMAGE);
        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        await expect(assetsPage.getAssetRow('test-image.jpg')).toBeVisible();
      });

      await test.step('I upload multiple files and track per-file progress across navigation', async () => {
        // Hold the uploads open, otherwise this step proves "the finished dialog
        // survives navigation" rather than the in-flight claim it is here to make:
        // at full speed both files complete before the nav click resolves.
        await page.route(UPLOAD_ROUTE, holdUploads);

        await assetsPage.uploadFilesWithFilePicker([IMAGE_1, IMAGE_2]);
        await expect(assetsPage.uploadProgressDialog).toBeVisible();

        // Still working — the success state has not been reached yet.
        await expect(assetsPage.uploadProgressDialog.getByText('Upload successful!')).toBeHidden();

        // the dialog persists while I navigate elsewhere in the admin  [CMS-107/1105].
        // Client-side navigation only: `page.goto()` is a full document load, which
        // tears down the SPA and the in-flight upload state along with it.
        await page.getByRole('link', { name: 'Content Manager' }).click();
        await page.waitForURL('**/admin/content-manager**');

        // The dialog is still there AND still in flight, which is the point.
        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await expect(assetsPage.uploadProgressDialog.getByText('Upload successful!')).toBeHidden();

        await page.unrouteAll({ behavior: 'ignoreErrors' });
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

        // The dialog reporting success is not the same as the file being there.
        await expect(assetsPage.getAssetRow('test-image.jpg')).toBeVisible();
      });

      await test.step('I upload from a URL', async () => {
        // Live third-party URL, deliberately left for now — see the note in
        // `file-upload.spec.ts`. The server-side fetch blocks loopback and private
        // addresses for SSRF, so neither `page.route` nor a locally served file can
        // replace it without a config option on the upload plugin.
        const before = await countAssets(page.request);

        await assetsPage.uploadFilesFromUrl('https://picsum.photos/200');
        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        // The fetched asset lands in the library. Counted rather than matched by
        // name: the remote host decides the filename, so there is nothing stable
        // to assert on.
        expect(await countAssets(page.request)).toBe(before + 1);
      });

      await test.step('I cancel and retry an upload', async () => {
        // Hold the uploads open so files are genuinely in flight when Cancel lands:
        // at full speed the batch finishes first and there is nothing to cancel.
        await page.route(UPLOAD_ROUTE, holdUploads);

        const batch = Array(5).fill(IMAGE);

        await assetsPage.uploadFilesWithFilePicker(batch);
        await expect(assetsPage.uploadProgressDialog).toBeVisible();

        await assetsPage.cancelUpload();
        // 'Uploads canceled' is the shipped copy (translations/en.json), not the
        // component's `defaultMessage`.
        await expect(assetsPage.uploadProgressDialog.getByText('Uploads canceled')).toBeVisible();

        // `unroute` only stops future requests — the handlers already sitting in
        // their timeout keep going and still call `route.continue()`. `unrouteAll`
        // drains them, so the cleanup is explicit rather than absorbed by the catch
        // inside the handler.
        await page.unrouteAll({ behavior: 'ignoreErrors' });

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

        // The count alone does not tell the user why the file was refused.
        await expect(assetsPage.uploadProgressDialog.getByText('blocked-file.exe')).toBeVisible();
        await expect(
          assetsPage.uploadProgressDialog.getByText(/not allowed|not supported/i)
        ).toBeVisible();

        await assetsPage.closeUploadProgressDialog();

        // "valid files in the same batch still upload" — check it landed, rather
        // than inferring it from the counter.
        await expect(assetsPage.getAssetRow('test-image.jpg')).toBeVisible();
      });

      await test.step('I bulk upload many files', async () => {
        // uploading > 20 files completes with no server crash        [CMS-358]
        const beforeBatch = await countAssets(page.request);
        const bigBatch = Array(25).fill(IMAGE);

        await assetsPage.uploadFilesWithFilePicker(bigBatch);
        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await assetsPage.waitForUploadProgressSuccess();
        await expect(
          assetsPage.uploadProgressDialog.getByText('25 files uploaded successfully')
        ).toBeVisible();
        await assetsPage.closeUploadProgressDialog();

        // The dialog's count comes from the client. Confirm the server kept them:
        // for a "no crash" step, the assets landing is the part that matters.
        expect(await countAssets(page.request)).toBeGreaterThanOrEqual(beforeBatch + 25);
      });

      // I upload files concurrently                                  [CMS-1111] (backlog)
      // Not shipped yet — nothing to assert until concurrency config lands.
    });
  }
);
