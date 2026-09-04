import path from 'path';

import { test, expect } from '@playwright/test';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

/**
 * Journey 4 — Organize many assets at once (CMS-1066).
 *
 * Bulk selection and actions across many assets. Broad and shallow: chains
 * every capability once in a single flow, per the journey's own framing in
 * CMS-1066.
 *
 * "I bulk-generate AI metadata" [CMS-145] is left as a comment, same as in
 * Journey 3: the AI mock-testing approach in the e2e harness is still an
 * open question (flagged by Adrien, unresolved as of 2026-08-06 in
 * CMS-1066).
 */

const UPLOADS_DIR = path.join(__dirname, '../../../data/uploads');
const IMAGE = path.join(UPLOADS_DIR, 'test-image.jpg');
const IMAGE_1 = path.join(UPLOADS_DIR, 'test-image-1.jpg');
const IMAGE_2 = path.join(UPLOADS_DIR, 'test-image-2.jpg');

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Journey 4: Organize many assets at once',
  () => {
    test.describe.configure({ timeout: 600_000 });

    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('a user can act on many assets at once', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();
      await assetsPage.switchToTableView();

      await assetsPage.uploadFilesWithFilePicker([IMAGE, IMAGE_1, IMAGE_2]);
      await assetsPage.waitForUploadProgressSuccess();
      await assetsPage.closeUploadProgressDialog();

      await test.step('I multi-select assets', async () => {
        await assetsPage.selectAsset('test-image.jpg');
        await expect(assetsPage.getBulkActionsBar()).toContainText('1 item selected');

        // shift+click selects a range; cmd/ctrl+click toggles one at a time
        await assetsPage.getSelectionCheckbox('test-image-2.jpg').click({ modifiers: ['Shift'] });
        await expect(assetsPage.getBulkActionsBar()).toContainText('items selected');

        // "Clear selection" clears it
        await assetsPage
          .getBulkActionsBar()
          .getByRole('button', { name: 'Clear selection' })
          .click();
        await expect(assetsPage.getBulkActionsBar()).not.toBeVisible();
      });

      await test.step('I select all / clear selection from the header', async () => {
        const selectAllCheckbox = page.getByRole('checkbox', { name: 'Select all' });

        await selectAllCheckbox.click();
        await expect(assetsPage.getBulkActionsBar()).toBeVisible();

        // clicking it again clears the whole selection
        await selectAllCheckbox.click();
        await expect(assetsPage.getBulkActionsBar()).not.toBeVisible();
      });

      await test.step('I bulk move assets', async () => {
        await assetsPage.createFolder('Bulk destination');

        await assetsPage.selectAsset('test-image.jpg');
        await assetsPage.selectAsset('test-image-1.jpg');
        await assetsPage.bulkMoveSelectionTo('Bulk destination');

        await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();
        await assetsPage.navigateIntoFolder('Bulk destination');
        await expect(assetsPage.getAssetRow('test-image.jpg')).toBeVisible();
        await expect(assetsPage.getAssetRow('test-image-1.jpg')).toBeVisible();
        await assetsPage.getHomeTreeRow().click();
      });

      await test.step('I drag and drop assets within the current view (shallow)', async () => {
        await assetsPage.createFolder('Shallow destination');
        await assetsPage.dragItemToFolder('test-image-2.jpg', 'Shallow destination', 'table');
        await assetsPage.waitForMoveSuccess();

        await assetsPage.navigateIntoFolder('Shallow destination');
        await expect(assetsPage.getAssetRow('test-image-2.jpg')).toBeVisible();
        await assetsPage.getHomeTreeRow().click();
      });

      await test.step('I drag and drop assets onto the folder tree (deep)', async () => {
        await assetsPage.createFolder('Deep destination');
        await assetsPage.navigateIntoFolder('Shallow destination');

        await assetsPage.dragItemToTreeFolder('test-image-2.jpg', 'Deep destination', 'table');
        await assetsPage.waitForMoveSuccess();

        await assetsPage.getHomeTreeRow().click();
        await assetsPage.navigateIntoFolder('Deep destination');
        await expect(assetsPage.getAssetRow('test-image-2.jpg')).toBeVisible();
        await assetsPage.getHomeTreeRow().click();
      });

      // I bulk-generate AI metadata                                  [CMS-145]
      // Open question (AI mock-testing approach) — nothing to assert yet.

      await test.step('I bulk delete assets', async () => {
        await assetsPage.navigateIntoFolder('Bulk destination');
        await assetsPage.selectAsset('test-image.jpg');
        await assetsPage.selectAsset('test-image-1.jpg');
        await assetsPage.bulkDeleteSelection();

        await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();
        await expect(assetsPage.getAssetRow('test-image-1.jpg')).not.toBeVisible();
      });
    });
  }
);
