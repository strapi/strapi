import path from 'path';

import { test, expect } from '@playwright/test';

import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { describeOnCondition } from '../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

/**
 * Journey 4 — Organize many assets at once.
 *
 * Bulk selection and actions across many assets. Broad and shallow: chains
 * every capability once in a single flow, per the journey's own framing.
 *
 * One note on row clicks, verified in AssetsTable.tsx
 * rather than assumed: "clicking a row anywhere except the file name selects
 * it" is not what the table does. `handleRowClick` opens the details drawer on
 * a plain click — exactly like clicking the name — and only selects when a
 * modifier is held (shift for a range, cmd/ctrl to toggle one). Selecting
 * without a modifier goes through the row's checkbox. Asserted as it behaves.
 *
 * Bulk AI metadata generation is left as a comment, same as in Journey 3: the
 * approach for mocking AI in the e2e harness is still an open question.
 */

const UPLOADS_DIR = path.join(__dirname, '../../data/uploads');
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
        // file header.
        await assetsPage.clickAssetInTable('test-image.jpg');
        await expect(assetsPage.assetDetailsDrawer).toBeVisible();
        await assetsPage.closeAssetDetailsDrawer();
        await expect(assetsPage.getBulkActionsBar()).not.toBeVisible();

        // shift+click on a row selects a range. Asserted against the size of
        // the range itself, derived from the rendered row order: a bare
        // "more than one selected" would pass just as well if shift merely
        // toggled the second row, which is the behaviour this step exists to
        // tell apart.
        // Sort before reasoning about row order. The default is by most recent update, so
        // three files uploaded in one batch land in whatever order their uploads finished —
        // which is not stable between runs.
        await assetsPage.pickSortOption('A to Z');

        const rowNames = await assetsPage.getTableRowNames();
        expect(rowNames.length).toBeGreaterThan(2);
        const firstRow = rowNames[0];
        const lastRow = rowNames[rowNames.length - 1];

        // Anchoring on the first and last rendered rows makes the range the whole list, so
        // the assertion holds wherever the uploaded files happen to sort.
        await assetsPage.selectAsset(firstRow);
        await expect(assetsPage.getBulkActionsBar()).toContainText('1 item selected');

        await assetsPage.getAssetRow(lastRow).click({ modifiers: ['Shift'] });
        await expect.poll(selectedCount, { timeout: 10_000 }).toBe(rowNames.length);

        // cmd/ctrl+click toggles one at a time — the row that closed the range comes back
        // off, and nothing else changes.
        await assetsPage.getAssetRow(lastRow).click({ modifiers: ['ControlOrMeta'] });
        await expect.poll(selectedCount, { timeout: 10_000 }).toBe(rowNames.length - 1);

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

        const allRows = await assetsPage.getTableRowNames();
        await selectAllCheckbox.click();
        await expect(assetsPage.getBulkActionsBar()).toBeVisible();
        // Exact, so this also checks "Select all" really takes everything on screen.
        await expect.poll(selectedCount, { timeout: 10_000 }).toBe(allRows.length);

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

      // I bulk-generate AI metadata
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
