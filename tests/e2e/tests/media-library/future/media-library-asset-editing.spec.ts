import path from 'path';

import { test, expect } from '@playwright/test';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

/**
 * Journey 3 — Edit & refine an asset (CMS-1527, journey plan in CMS-1066).
 *
 * Broad and shallow: one test chains every edit action a user performs on a
 * single asset, in the order they would perform them. The narrow per-feature
 * assertions live in their own specs (asset-details.spec.ts,
 * asset-crop.spec.ts) — this spec exists to prove the chain holds together.
 *
 * The journey runs against `ted_lasso_profile.jpeg`, seeded by the
 * `with-admin` DTS import, rather than uploading a fixture: the
 * `test-image*.jpg` files in tests/e2e/data/uploads are 1x1 PNGs carrying a
 * .jpg extension. They are fine as an upload or replace payload, but there is
 * nothing to crop in a 1x1 image and no room for a focal point at (10, 12).
 *
 * "I generate AI metadata" [CMS-145] is left as a comment: the AI
 * mock-testing approach for the e2e harness is still an open question in
 * CMS-1066, and there is nothing to assert without inventing a mocking
 * strategy that isn't this spec's call to make.
 */

const UPLOADS_DIR = path.join(__dirname, '../../../data/uploads');
const REPLACEMENT = path.join(UPLOADS_DIR, 'test-image-2.jpg');
const PDF = path.join(UPLOADS_DIR, 'test-document.pdf');

const ASSET = 'ted_lasso_profile.jpeg';
const RENAMED = 'journey3_refined.jpeg';
const ALT_TEXT = 'Head coach Ted Lasso';
const CAPTION = 'Shot during pre-season';

describeOnCondition(process.env.E2E_MEDIA_LIBRARY === 'current')(
  'Media Library - Journey 3: Edit & refine an asset',
  () => {
    test.describe.configure({ timeout: 600_000 });

    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('a user can edit and refine an asset', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await test.step("I open an asset's details drawer", async () => {
        // Works from grid view…
        await assetsPage.switchToGridView();
        await assetsPage.clickAssetInGrid(ASSET);
        await expect(assetsPage.assetDetailsDrawer).toBeVisible();
        await assetsPage.closeAssetDetailsDrawer();
        await expect(assetsPage.assetDetailsDrawer).not.toBeVisible();

        // …and from table view.
        await assetsPage.switchToTableView();
        await assetsPage.clickAssetInTable(ASSET);
        await expect(assetsPage.assetDetailsDrawer).toBeVisible();

        // I see read-only file info. Note there is no URL row in the drawer —
        // the asset URL is exposed through the "Copy link" footer action
        // asserted further down, not as a File info field.
        await expect(assetsPage.assetDetailsDrawer.getByText('File info').first()).toBeVisible();
        for (const label of [
          'Size',
          'Dimensions',
          'Extension',
          'Asset ID',
          'Creation date',
          'Last updated',
        ]) {
          await expect(assetsPage.getDrawerDetailValue(label).first()).not.toBeEmpty();
        }
        await expect(assetsPage.getDrawerDetailValue('Dimensions').first()).toContainText(
          /\d+\s*[x×]\s*\d+/
        );
      });

      await test.step('I edit metadata', async () => {
        const saveButton = assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Save' });

        // Save is disabled until the form is dirty.
        await expect(saveButton).toBeDisabled();

        await assetsPage.fillAssetDetailsDrawerText('File name', RENAMED);
        await assetsPage.fillAssetDetailsDrawerText('Alternative text', ALT_TEXT);
        await assetsPage.fillAssetDetailsDrawerText('Caption', CAPTION);
        await expect(saveButton).toBeEnabled();

        await assetsPage.clickAssetDetailsDrawerSave();

        // Metadata save reports in-drawer (`useDrawerNotify`), not through the
        // global sonner region — unlike delete further down, which fires a
        // real `toggleNotification`.
        await expect(assetsPage.getDrawerToast(/File updated/i)).toBeVisible({ timeout: 10_000 });

        // Changes persist after closing and reopening the drawer.
        await assetsPage.closeAssetDetailsDrawer();
        await expect(assetsPage.assetDetailsDrawer).not.toBeVisible();

        await assetsPage.clickAssetInTable(RENAMED);
        await expect(assetsPage.assetDetailsDrawer).toBeVisible();
        await expect(assetsPage.getAssetDetailsDrawerTextField('File name')).toHaveValue(RENAMED);
        await expect(assetsPage.getAssetDetailsDrawerTextField('Alternative text')).toHaveValue(
          ALT_TEXT
        );
        await expect(assetsPage.getAssetDetailsDrawerTextField('Caption')).toHaveValue(CAPTION);
      });

      const previewImage = assetsPage.assetDetailsDrawer.locator('img').first();

      await test.step('I crop an image — Apply overwrites the original', async () => {
        // The crop action is only offered for image assets (the non-image case
        // is asserted in the PDF step below).
        await expect(
          assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Crop' })
        ).toBeVisible();

        const srcBeforeCrop = await previewImage.getAttribute('src');
        expect(srcBeforeCrop).toBeTruthy();

        await assetsPage.openCropEditor();
        await assetsPage.applyCrop();
        await expect(assetsPage.getDrawerToast(/File cropped/i)).toBeVisible({ timeout: 10_000 });

        // The preview updates rather than serving a stale cached file: the
        // cache-busting `?v=<updatedAt>` query on the preview URL changes.
        await expect(previewImage).not.toHaveAttribute('src', srcBeforeCrop!);
        await expect(previewImage).toHaveAttribute('src', /[?&]v=\d+/);
      });

      /** How many table rows are currently listed under the journey's asset name. */
      const rowsNamedAsset = async () =>
        (await assetsPage.getTableRowNames()).filter((name) => name === RENAMED).length;

      await test.step('I crop an image — Save as copy creates a new asset', async () => {
        const namesBefore = await assetsPage.getTableRowNames();
        expect(await rowsNamedAsset()).toBe(1);

        await assetsPage.openCropEditor();
        await assetsPage.saveCropAsCopy();
        await expect(assetsPage.getDrawerToast(/Copy created/i)).toBeVisible({ timeout: 10_000 });

        // Folder count +1.
        await expect
          .poll(async () => (await assetsPage.getTableRowNames()).length, { timeout: 15_000 })
          .toBe(namesBefore.length + 1);

        // The copy is uploaded with `name: asset.name` (see
        // handleCropSaveAsCopy in AssetDetailsDrawer.tsx), so it lands under
        // the *exact same* name as the original: the "default-name convention
        // TBC with design" flagged in CMS-1066 currently resolves to no rename
        // at all, and the two rows are indistinguishable by name in the list.
        // Hence a count of rows carrying the name, rather than a lookup of a
        // distinct copy name. The original is untouched — still one of them.
        expect(await rowsNamedAsset()).toBe(2);
      });

      await test.step('I set a focal point', async () => {
        await assetsPage.openCropEditor();

        // DS `NumberInput` renders a text input (its own unit tests assert a
        // string value), so it carries role `textbox`, not `spinbutton` —
        // address it by its aria-label instead of guessing the role.
        const focalX = page.getByLabel('Focal point X (px)', { exact: true });
        const focalY = page.getByLabel('Focal point Y (px)', { exact: true });

        // The pixel fields are a view over a focal point stored as a
        // *whole-percent* pair — `setFocalPx` does `Math.round(pct)`
        // (AssetCropEditor.tsx). On this asset (5616px wide) one percent is
        // ~56px, so any pixel value that isn't on a percent boundary snaps
        // away and a literal 10px round-trips back as 0. Derive the targets
        // from the fields' own `max` (the crop dimensions) at 25%/40% so the
        // round-trip is exact, and keep the two axes distinct so a swapped
        // axis would still fail.
        const cropWidth = Number(await focalX.getAttribute('max'));
        const cropHeight = Number(await focalY.getAttribute('max'));
        expect(cropWidth).toBeGreaterThan(0);
        expect(cropHeight).toBeGreaterThan(0);

        const targetX = String(Math.round(cropWidth * 0.25));
        const targetY = String(Math.round(cropHeight * 0.4));

        await focalX.fill(targetX);
        await focalX.blur();
        await focalY.fill(targetY);
        await focalY.blur();

        await assetsPage.applyCrop();
        await expect(assetsPage.getDrawerToast(/File cropped/i)).toBeVisible({ timeout: 10_000 });

        // It persists after Save. The field renders the number with the
        // locale's group separator ("1,404"), so compare the parsed value
        // instead of the displayed string.
        await assetsPage.openCropEditor();
        const readFocal = async (label: string) =>
          Number(
            (await page.getByLabel(label, { exact: true }).inputValue()).replace(/[^\d.-]/g, '')
          );
        await expect
          .poll(() => readFocal('Focal point X (px)'), { timeout: 10_000 })
          .toBe(Number(targetX));
        await expect
          .poll(() => readFocal('Focal point Y (px)'), { timeout: 10_000 })
          .toBe(Number(targetY));
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Apply' })).not.toBeVisible();
      });

      await test.step('I replace the file', async () => {
        await assetsPage.replaceAssetFromDrawer(REPLACEMENT);

        // In-drawer success toast, drawer stays open.
        await expect(assetsPage.getDrawerToast(/File replaced/i)).toBeVisible({ timeout: 10_000 });
        await expect(assetsPage.assetDetailsDrawer).toBeVisible();

        // Metadata is kept and the asset stays in its folder (the root here).
        await expect(assetsPage.getAssetDetailsDrawerTextField('Alternative text')).toHaveValue(
          ALT_TEXT
        );
        await expect(assetsPage.getAssetDetailsDrawerTextField('Caption')).toHaveValue(CAPTION);
        await expect(assetsPage.getAssetDetailsDrawerLocationSelect()).toContainText(
          /Media Library|Home/
        );

        // The new file is served, not the old one: the 1x1 replacement resets
        // the reported dimensions.
        await expect(assetsPage.getDrawerDetailValue('Dimensions').first()).toContainText(
          /\b1\s*[x×]\s*1\b/
        );
      });

      // I generate AI metadata                                        [CMS-145]
      // Open question (AI mock-testing approach in the e2e harness) — nothing
      // to assert yet, see the file header.

      await test.step('I use the footer actions', async () => {
        await expect(
          assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Download' })
        ).toBeVisible();

        await assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Copy link' }).click();
        await expect(assetsPage.getDrawerToast(/Link copied/i)).toBeVisible();
      });

      await test.step('I delete the asset', async () => {
        await assetsPage.deleteAssetFromDrawer();

        await expect(assetsPage.assetDetailsDrawer).not.toBeVisible({ timeout: 10_000 });
        await assetsPage.waitForNotification();

        // The asset is removed from the list. Counted, not matched by name: the
        // "Save as copy" duplicate carries the identical name and stays behind,
        // so 2 rows become 1 rather than 0.
        await expect.poll(rowsNamedAsset, { timeout: 15_000 }).toBe(1);
      });

      await test.step('I preview a PDF', async () => {
        await assetsPage.uploadFilesWithFilePicker(PDF);
        await assetsPage.completeUpload();

        await assetsPage.switchToTableView();
        await assetsPage.clickAssetInTable('test-document');
        await expect(assetsPage.assetDetailsDrawer).toBeVisible();

        // Inline iframe preview, titled with the asset name.
        await expect(page.getByTitle('test-document.pdf')).toBeVisible();

        // …and no crop action, since this is not an image.
        await expect(
          assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Crop' })
        ).toHaveCount(0);
      });
    });
  }
);
