import path from 'path';

import { test, expect } from '@playwright/test';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

/**
 * Journey 3 — Edit & refine an asset (CMS-1066).
 *
 * A user opens an asset and works through every edit action. Broad and
 * shallow: chains every capability once in a single flow, per the journey's
 * own framing in CMS-1066.
 *
 * The drawer, once opened on "test-image", is deliberately never closed and
 * re-found by name again after the crop step — "Save as copy" creates a
 * second asset whose name is TBC with design (still an open question in
 * CMS-1066), and a substring match on 'test-image' could otherwise land on
 * either one. Everything through delete happens against the one drawer
 * instance already open.
 *
 * Two corrections to the ticket's stale "(backlog)" tags, verified directly
 * against packages/core/upload/admin/src/future:
 *  - Focal point (CMS-411) IS shipped — AssetCropEditor.tsx renders a
 *    draggable handle plus precise X/Y pixel inputs, submitted together with
 *    the crop. Tested as an active step, not skipped.
 *  - PDF preview IS shipped — AssetPreview.tsx renders an inline iframe for
 *    any asset detected as application/pdf. Tested as an active step.
 *
 * "I generate AI metadata" [CMS-145] is left as a comment: the AI
 * mock-testing approach in the e2e harness is still an open question
 * (flagged by Adrien, unresolved as of 2026-08-06 in CMS-1066) — nothing to
 * assert without inventing a mocking strategy that isn't this PR's call.
 */

const UPLOADS_DIR = path.join(__dirname, '../../../data/uploads');
const IMAGE = path.join(UPLOADS_DIR, 'test-image.jpg');
const PDF = path.join(UPLOADS_DIR, 'test-document.pdf');

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
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

      await assetsPage.uploadFilesWithFilePicker(IMAGE);
      await assetsPage.waitForUploadProgressSuccess();
      await assetsPage.closeUploadProgressDialog();

      await test.step("I open an asset's details drawer", async () => {
        await assetsPage.switchToGridView();
        await assetsPage.clickAssetInGrid('test-image');
        await expect(assetsPage.assetDetailsDrawer).toBeVisible();
        await assetsPage.closeAssetDetailsDrawer();

        await assetsPage.switchToTableView();
        await assetsPage.clickAssetInTable('test-image');
        await expect(assetsPage.assetDetailsDrawer).toBeVisible();
      });

      await test.step('I edit metadata', async () => {
        const saveButton = assetsPage.assetDetailsDrawer.getByRole('button', {
          name: 'Save changes',
        });
        await expect(saveButton).toBeDisabled();

        await assetsPage.fillAssetDetailsDrawerText('Alternative text', 'A test image');
        await expect(saveButton).toBeEnabled();
        await assetsPage.clickAssetDetailsDrawerSave();

        // persists after closing and reopening the drawer — still safe here,
        // no "Save as copy" has run yet so the name is still unambiguous.
        await assetsPage.closeAssetDetailsDrawer();
        await assetsPage.clickAssetInTable('test-image');
        await expect(assetsPage.getAssetDetailsDrawerTextField('Alternative text')).toHaveValue(
          'A test image'
        );
      });

      // From here on the drawer stays open on this exact asset instance —
      // see the file-level comment on why we don't re-find it by name.

      await test.step('I crop an image', async () => {
        await assetsPage.openCropEditor();
        await assetsPage.applyCrop();
        await expect(assetsPage.getDrawerToast(/File cropped/i)).toBeVisible({ timeout: 10_000 });

        await assetsPage.openCropEditor();
        await assetsPage.saveCropAsCopy();
        await expect(assetsPage.getDrawerToast(/Copy created/i)).toBeVisible({ timeout: 10_000 });
      });

      await test.step('I set a focal point', async () => {
        await assetsPage.openCropEditor();

        const focalX = page.getByRole('spinbutton', { name: 'Focal point X (px)' });
        const focalY = page.getByRole('spinbutton', { name: 'Focal point Y (px)' });

        await focalX.fill('10');
        await focalX.blur();
        await focalY.fill('12');
        await focalY.blur();

        await assetsPage.applyCrop();
        await expect(assetsPage.getDrawerToast(/File cropped/i)).toBeVisible({ timeout: 10_000 });

        // it persists after Save
        await assetsPage.openCropEditor();
        await expect(page.getByRole('spinbutton', { name: 'Focal point X (px)' })).toHaveValue(
          '10'
        );
        await expect(page.getByRole('spinbutton', { name: 'Focal point Y (px)' })).toHaveValue(
          '12'
        );
        await page.keyboard.press('Escape');
      });

      await test.step('I replace the file', async () => {
        await assetsPage.replaceAssetFromDrawer(IMAGE);
        await expect(assetsPage.getDrawerToast(/File replaced/i)).toBeVisible({ timeout: 10_000 });
      });

      // I generate AI metadata                                       [CMS-145]
      // Open question (AI mock-testing approach) — nothing to assert yet.

      await test.step('I use the footer actions', async () => {
        await expect(
          assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Download' })
        ).toBeVisible();

        await assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Copy link' }).click();
        await expect(assetsPage.getDrawerToast(/Link copied/i)).toBeVisible();
      });

      await test.step('I delete the asset', async () => {
        await assetsPage.deleteAssetFromDrawer();
        // Not asserting on the list row here: a "Save as copy" duplicate
        // earlier in this test may still contain "test-image" as a
        // substring, so the drawer closing is the unambiguous signal.
        await expect(assetsPage.assetDetailsDrawer).not.toBeVisible();
      });

      await test.step('I preview a PDF', async () => {
        // Standalone: a fresh, uniquely-named asset with no ambiguity risk.
        await assetsPage.uploadFilesWithFilePicker(PDF);
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        await assetsPage.switchToTableView();
        await assetsPage.clickAssetInTable('test-document');
        await expect(page.getByTitle('test-document.pdf')).toBeVisible();
      });
    });
  }
);
