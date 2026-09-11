import path from 'path';

import { test, expect } from '@playwright/test';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

/**
 * Journey 4 — Organize many assets at once (CMS-1528, journey plan in CMS-1066).
 *
 * Bulk selection and actions across many assets. Broad and shallow: chains
 * every capability once in a single flow, per the journey's own framing.
 *
 * One correction to the ticket's pseudocode, verified in AssetsTable.tsx
 * rather than assumed: "clicking a row anywhere except the file name selects
 * it" is not what the table does. `handleRowClick` opens the details drawer on
 * a plain click — exactly like clicking the name — and only selects when a
 * modifier is held (shift for a range, cmd/ctrl to toggle one). Selecting
 * without a modifier goes through the row's checkbox. Asserted as it behaves.
 *
 * "I bulk-generate AI metadata" [CMS-145] is left as a comment, same as in
 * Journey 3: the AI mock-testing approach in the e2e harness is still an open
 * question in CMS-1066.
 */

const UPLOADS_DIR = path.join(__dirname, '../../../data/uploads');
const IMAGE = path.join(UPLOADS_DIR, 'test-image.jpg');
const IMAGE_1 = path.join(UPLOADS_DIR, 'test-image-1.jpg');
const IMAGE_2 = path.join(UPLOADS_DIR, 'test-image-2.jpg');

describeOnCondition(process.env.E2E_MEDIA_LIBRARY === 'current')(
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
      await assetsPage.completeUpload();

      /**
       * The selected-item count as rendered by the bulk action bar.
       *
       * Read from the bar's own `data-bar-slot="count"` hook and parsed, rather
       * than asserted against a literal: a shift-click range spans whatever the
       * current sort puts between the two rows, so the exact total depends on
       * ordering the journey does not control.
       */
      const selectedCount = async () => {
        const text = await assetsPage
          .getBulkActionsBar()
          .locator('[data-bar-slot="count"]')
          .innerText();
        return Number(text.match(/\d+/)?.[0] ?? 0);
      };

      /**
       * Wait until two consecutive reads of the row list agree.
       *
       * `dragItemToFolder` measures the source and target `boundingBox()`
       * before it moves the pointer, so a refetch landing mid-drag (the
       * reload after a folder creation triggers one) leaves it dropping on
       * stale coordinates and the move never fires. Settling the list first
       * is what makes the pointer drag reproducible.
       */
      const waitForListSettled = async () => {
        let previous: string[] = [];
        await expect
          .poll(
            async () => {
              const current = await assetsPage.getTableRowNames();
              const stable = previous.length > 0 && current.join('|') === previous.join('|');
              previous = current;
              return stable;
            },
            { timeout: 15_000, intervals: [250, 250, 500] }
          )
          .toBe(true);
      };

      await test.step('I multi-select assets', async () => {
        // A plain row click opens the drawer — it does not select. See the
        // file header: this is the ticket's one factual error.
        await assetsPage.clickAssetInTable('test-image.jpg');
        await expect(assetsPage.assetDetailsDrawer).toBeVisible();
        await assetsPage.closeAssetDetailsDrawer();
        await expect(assetsPage.getBulkActionsBar()).not.toBeVisible();

        // The row checkbox is the unmodified way to select.
        await assetsPage.selectAsset('test-image.jpg');
        await expect(assetsPage.getBulkActionsBar()).toContainText('1 item selected');

        // shift+click on a row selects a range. Asserted against the size of
        // the range itself, derived from the rendered row order: a bare
        // "more than one selected" would pass just as well if shift merely
        // toggled the second row, which is the behaviour this step exists to
        // tell apart.
        const rowNames = await assetsPage.getTableRowNames();
        const from = rowNames.indexOf('test-image.jpg');
        const to = rowNames.indexOf('test-image-2.jpg');
        expect(from).toBeGreaterThanOrEqual(0);
        expect(to).toBeGreaterThanOrEqual(0);
        const rangeSize = Math.abs(to - from) + 1;
        expect(rangeSize).toBeGreaterThan(2);

        await assetsPage.getAssetRow('test-image-2.jpg').click({ modifiers: ['Shift'] });
        await expect.poll(selectedCount, { timeout: 10_000 }).toBe(rangeSize);
        const rangeCount = rangeSize;

        // cmd/ctrl+click toggles one at a time — the row just added by the
        // range comes back off, and nothing else changes.
        await assetsPage.getAssetRow('test-image-2.jpg').click({ modifiers: ['ControlOrMeta'] });
        await expect.poll(selectedCount, { timeout: 10_000 }).toBe(rangeCount - 1);

        // The bar carries a close button (a Cross icon labelled "Clear
        // selection"); it clears the selection and the bar goes away.
        await assetsPage
          .getBulkActionsBar()
          .getByRole('button', { name: 'Clear selection' })
          .click();
        await expect(assetsPage.getBulkActionsBar()).not.toBeVisible();
      });

      await test.step('I select every asset from the table header', async () => {
        // Unambiguous despite the bulk bar also offering "Select all": the
        // header control is a checkbox, the bar's is a text button.
        const selectAllCheckbox = page.getByRole('checkbox', { name: 'Select all' });

        await selectAllCheckbox.click();
        await expect(assetsPage.getBulkActionsBar()).toBeVisible();
        expect(await selectedCount()).toBeGreaterThan(1);

        // Clicking it again clears the whole selection.
        await selectAllCheckbox.click();
        await expect(assetsPage.getBulkActionsBar()).not.toBeVisible();
      });

      await test.step('I bulk move assets', async () => {
        await assetsPage.createFolder('Bulk destination');
        await assetsPage.waitForNotification();
        await assetsPage.goto();
        await assetsPage.switchToTableView();

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
        await assetsPage.waitForNotification();
        await assetsPage.goto();
        await assetsPage.switchToTableView();

        await expect(assetsPage.getAssetRow('test-image-2.jpg')).toBeVisible();
        await expect(assetsPage.getFolderRow('Shallow destination')).toBeVisible();
        await waitForListSettled();

        await assetsPage.dragItemToFolder('test-image-2.jpg', 'Shallow destination', 'table');
        await assetsPage.waitForMoveSuccess();

        await assetsPage.navigateIntoFolder('Shallow destination');
        await expect(assetsPage.getAssetRow('test-image-2.jpg')).toBeVisible();
        await assetsPage.getHomeTreeRow().click();
      });

      await test.step('I drag and drop assets onto the folder tree (deep)', async () => {
        await assetsPage.createFolder('Deep destination');
        await assetsPage.waitForNotification();
        await assetsPage.goto();
        await assetsPage.switchToTableView();

        await assetsPage.navigateIntoFolder('Shallow destination');
        await expect(assetsPage.getAssetRow('test-image-2.jpg')).toBeVisible();
        await expect(assetsPage.getTreeFolderRow('Deep destination')).toBeVisible();
        await waitForListSettled();

        await assetsPage.dragItemToTreeFolder('test-image-2.jpg', 'Deep destination', 'table');
        await assetsPage.waitForMoveSuccess();

        await assetsPage.getHomeTreeRow().click();
        await assetsPage.navigateIntoFolder('Deep destination');
        await expect(assetsPage.getAssetRow('test-image-2.jpg')).toBeVisible();
        await assetsPage.getHomeTreeRow().click();
      });

      // I bulk-generate AI metadata                                   [CMS-145]
      // Open question (AI mock-testing approach) — nothing to assert yet.

      await test.step('I bulk delete assets', async () => {
        await assetsPage.navigateIntoFolder('Bulk destination');

        await assetsPage.selectAsset('test-image.jpg');
        await assetsPage.selectAsset('test-image-1.jpg');
        await expect(assetsPage.getBulkActionsBar()).toContainText('2 items selected');

        await assetsPage.bulkDeleteSelection();

        await expect(assetsPage.getAssetRow('test-image.jpg')).not.toBeVisible();
        await expect(assetsPage.getAssetRow('test-image-1.jpg')).not.toBeVisible();
      });
    });
  }
);
