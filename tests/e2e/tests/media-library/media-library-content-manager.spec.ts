import path from 'path';

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../constants';
import { loginWithApi } from '../../../utils/login';
import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import { describeOnCondition, findAndClose } from '../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';
import { MediaField, createFilesDataTransfer, getEditViewField } from './page-objects/MediaField';

/**
 * Journey 6 — Add assets to an entry (CMS-2003).
 *
 * An editor fills the single media, multiple media and Blocks fields of one entry
 * through every way of adding an asset, then saves. Critical paths only: the details
 * of each behaviour (search, folders, permissions, allowed types, failed uploads...)
 * are covered by the component tests of the asset picker and the media field.
 *
 * Complex Content is the content type of the e2e app that holds a single media,
 * a multiple media and a Blocks field.
 */

const UPLOADS_DIR = path.join(__dirname, '../../data/uploads');
const IMAGE = path.join(UPLOADS_DIR, 'test-image.jpg');
const IMAGE_1 = path.join(UPLOADS_DIR, 'test-image-1.jpg');
const IMAGE_2 = path.join(UPLOADS_DIR, 'test-image-2.jpg');

// Seeded at the root of the library by the `with-admin` data packet.
const LIBRARY_ASSET = 'ted_lasso_profile.jpeg';
const NEW_CAPTION = 'Ted Lasso, head coach';

const CONTENT_TYPE_UID = 'api::complex.complex';
const CREATE_URL = `/admin/content-manager/collection-types/${CONTENT_TYPE_UID}/create`;

/**
 * The caption of the first asset named `name`, straight from the API: the drawer
 * closing is not proof that the library kept the change.
 */
const getAssetCaption = async (request: APIRequestContext, name: string) => {
  const auth = await request.post('/admin/login', {
    data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
  });
  const token = (await auth.json())?.data?.token;
  expect(token, 'admin API login failed').toBeTruthy();

  const listed = await request.get(`/upload/files?filters[name][$eq]=${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const [asset] = ((await listed.json())?.results ?? []) as { caption?: string | null }[];
  return asset?.caption ?? null;
};

/**
 * The entry is new, so the first save is a create (POST), not the PUT that
 * `withContentManagerSave` waits for.
 */
const waitForEntryCreated = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes(`/content-manager/collection-types/${CONTENT_TYPE_UID}`) &&
      response.ok()
  );

describeOnCondition(process.env.E2E_MEDIA_LIBRARY === 'current')(
  'Media Library - Journey 6: Add assets to an entry',
  () => {
    test.describe.configure({ timeout: 300_000 });

    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      // The permissions snapshot in `with-admin` predates Complex Content, so the Super
      // Admin could not open it. Resync rebuilds CM config + Super Admin permissions.
      await resyncSuperAdminPermissionsAfterImport();
      await loginWithApi({ page });
      await page.goto('/admin');
    });

    test('an editor adds assets to an entry through every path and saves it', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      const singleMedia = new MediaField(page, 'mediasingle');
      const multipleMedia = new MediaField(page, 'mediamultiple');
      const blocksEditor = page.locator('[contenteditable="true"]');
      const blocksField = getEditViewField(page, 'blocks', blocksEditor);

      await test.step('I create a Complex Content entry', async () => {
        await page.goto(CREATE_URL);
        await page.getByRole('textbox', { name: /^required/ }).fill('Journey 6 entry');
        await expect(singleMedia.addAssetButton).toBeVisible();
      });

      await test.step('I pick a library asset for a single media field', async () => {
        const picker = await singleMedia.openAssetPicker('mediasingle');

        await picker.getByText(LIBRARY_ASSET, { exact: true }).first().click();
        await expect(picker.getByRole('tab', { name: /Selected assets/ })).toContainText('1');

        await picker.getByRole('button', { name: 'Confirm' }).click();
        await expect(picker).not.toBeVisible();

        await expect(singleMedia.getEditButton(LIBRARY_ASSET)).toBeVisible();
      });

      await test.step('I edit the asset from the field', async () => {
        const entryUrl = page.url();

        await singleMedia.getEditButton(LIBRARY_ASSET).click();
        await expect(assetsPage.assetDetailsDrawer).toBeVisible();
        // The drawer opens over the entry: unlike the Media Library page, no ?assetId= in the URL.
        expect(page.url()).toBe(entryUrl);

        await assetsPage.fillAssetDetailsDrawerText('Caption', NEW_CAPTION);
        await assetsPage.clickAssetDetailsDrawerSave();

        await expect
          .poll(() => getAssetCaption(page.request, LIBRARY_ASSET), {
            message: 'the new caption never reached the library',
          })
          .toBe(NEW_CAPTION);

        await assetsPage.closeAssetDetailsDrawer();
        await expect(assetsPage.assetDetailsDrawer).not.toBeVisible();
      });

      await test.step('I remove the asset from the field', async () => {
        await singleMedia.getRemoveButton(LIBRARY_ASSET).click();

        await expect(singleMedia.getEditButton(LIBRARY_ASSET)).not.toBeVisible();
        await expect(singleMedia.dropZone).toBeVisible();
      });

      await test.step('I upload from my device through the Add asset menu', async () => {
        await singleMedia.uploadFromDevice(IMAGE);

        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        await expect(singleMedia.getEditButton('test-image.jpg')).toBeVisible();
      });

      await test.step('I drop files on a multiple media field', async () => {
        await multipleMedia.dropFiles([IMAGE_1, IMAGE_2]);

        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        // Complex Content lays this field out at half width, so the carousel shows one
        // card at a time. It scrolls to the newest card, the last file of the drop.
        await expect(multipleMedia.getCardMenuButton('test-image-2.jpg')).toBeVisible();
        await multipleMedia.previousSlideButton.click();
        await expect(multipleMedia.getCardMenuButton('test-image-1.jpg')).toBeVisible();
      });

      await test.step('I drop an image into a Blocks field', async () => {
        const dataTransfer = await createFilesDataTransfer(page, IMAGE_2);
        const editor = blocksField.locator('[contenteditable="true"]');

        await editor.dispatchEvent('dragenter', { dataTransfer });
        await editor.dispatchEvent('dragover', { dataTransfer });
        await expect(blocksField.getByText('Drop to upload and insert')).toBeVisible();

        await editor.dispatchEvent('drop', { dataTransfer });

        await expect(assetsPage.uploadProgressDialog).toBeVisible();
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        // An image block takes the asset's alternative text, or its name when it has none.
        await expect(blocksField.getByRole('img', { name: 'test-image-2.jpg' })).toBeVisible();
      });

      await test.step('I save the entry', async () => {
        const created = waitForEntryCreated(page);
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await created;
        await findAndClose(page, 'Saved document');

        // Saving a new entry moves from /create to the entry's own URL.
        await expect(page).not.toHaveURL(/\/create$/);
        await page.reload();

        await expect(singleMedia.getEditButton('test-image.jpg')).toBeVisible();

        // After a reload the carousel starts from the first card: the order was kept.
        await expect(multipleMedia.getCardMenuButton('test-image-1.jpg')).toBeVisible();
        await multipleMedia.nextSlideButton.click();
        await expect(multipleMedia.getCardMenuButton('test-image-2.jpg')).toBeVisible();

        await expect(blocksField.getByRole('img', { name: 'test-image-2.jpg' })).toBeVisible();
      });
    });
  }
);
