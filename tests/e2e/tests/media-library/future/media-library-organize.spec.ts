import path from 'path';

import { test, expect } from '@playwright/test';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

/**
 * Journey 2 — Organize my library (CMS-1066).
 *
 * A content manager structures an already-populated library and finds assets
 * within it. Broad and shallow: chains every capability once in a single
 * flow, per the journey's own framing in CMS-1066.
 *
 * Two steps from the ticket's pseudocode are not yet shippped in the
 * future/unstable Media Library as of this writing, so they're left as
 * comments rather than fabricated assertions:
 *  - "rename a folder" [CMS-127] — no rename mutation/UI exists anywhere in
 *    packages/core/upload/admin/src/future (FolderActionsMenu only offers
 *    Copy link / Move to folder / Delete folder).
 *  - "the breadcrumb reflects the current depth" — there is no breadcrumb
 *    component in future/; the header instead shows "<Folder> (N items)".
 */

const UPLOADS_DIR = path.join(__dirname, '../../../data/uploads');
const IMAGE = path.join(UPLOADS_DIR, 'test-image.jpg');

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Journey 2: Organize my library',
  () => {
    test.describe.configure({ timeout: 600_000 });

    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('a content manager can organize and find their assets', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();
      await assetsPage.switchToGridView();

      await test.step('I create a folder structure', async () => {
        await assetsPage.createFolder('Marketing');
        await expect(assetsPage.getFolderCard('Marketing')).toBeVisible();

        // I can create nested sub-folders                          [CMS-127/131/133]
        await assetsPage.navigateIntoFolder('Marketing');
        await expect(page.getByRole('heading', { name: /^Marketing/ })).toBeVisible();

        await assetsPage.createFolder('Campaigns');
        await expect(assetsPage.getFolderCard('Campaigns')).toBeVisible();
      });

      await test.step('I navigate folders', async () => {
        // folders show as nodes in the side tree                    [CMS-130/133]
        await assetsPage.navigateIntoFolder('Campaigns');
        await expect(page.getByRole('heading', { name: /^Campaigns/ })).toBeVisible();

        await assetsPage.getHomeTreeRow().click();
        await expect(page.getByRole('heading', { name: /^Media Library/ })).toBeVisible();
      });

      await test.step('I use the folder "…" actions menu', async () => {
        await assetsPage.createFolder('Design assets');

        // Copy link to folder                                      [CMS-1497]
        const designFolderCard = assetsPage.getFolderCard('Design assets');
        await designFolderCard.getByRole('button', { name: 'More actions' }).click();
        await page.getByRole('menuitem', { name: 'Copy link to folder' }).click();
        await expect(
          page
            .getByRole('region', { name: 'Notifications' })
            .getByRole('status')
            .filter({ hasText: 'Folder link copied.' })
        ).toBeVisible();

        // Move the folder itself into another folder                [CMS-1497]
        await designFolderCard.getByRole('button', { name: 'More actions' }).click();
        await page.getByRole('menuitem', { name: 'Move to folder' }).click();
        const moveDialog = page.getByRole('dialog', { name: 'Move elements to' });
        await moveDialog.getByRole('combobox').click();
        await page.getByRole('option', { name: 'Marketing' }).click();
        await moveDialog.getByRole('button', { name: 'Move' }).click();
        await expect(assetsPage.getMoveSuccessNotification()).toBeVisible();
        await expect(assetsPage.getFolderCard('Design assets')).not.toBeVisible();

        await assetsPage.navigateIntoFolder('Marketing');
        await expect(assetsPage.getFolderCard('Design assets')).toBeVisible();
        await assetsPage.getHomeTreeRow().click();
      });

      await test.step('I move an asset into a folder', async () => {
        await assetsPage.uploadFilesWithFilePicker(IMAGE);
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        await assetsPage.switchToTableView();
        await assetsPage.clickAssetInTable('test-image');
        await assetsPage.selectAssetDetailsDrawerLocation('Marketing');
        await assetsPage.clickAssetDetailsDrawerSave();
        await assetsPage.closeAssetDetailsDrawer();

        await expect(assetsPage.getAssetRow('test-image')).not.toBeVisible();
        await assetsPage.navigateIntoFolder('Marketing');
        await expect(assetsPage.getAssetRow('test-image')).toBeVisible();
        await assetsPage.getHomeTreeRow().click();
      });

      await test.step('I search for an asset', async () => {
        await assetsPage.uploadFilesWithFilePicker(IMAGE);
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        const searchBox = page.getByRole('searchbox', { name: 'Search for an asset' });
        await searchBox.fill('test-image');
        await expect(assetsPage.getAssetRow('test-image')).toBeVisible();

        await searchBox.fill('no-such-asset-xyz');
        await expect(page.getByText(/no.*match|no results/i)).toBeVisible();

        await searchBox.fill('');
      });

      await test.step('I sort assets', async () => {
        await assetsPage.pickSortOption('A to Z');
        const namesAsc = await assetsPage.getTableRowNames();

        await assetsPage.pickSortOption('Z to A');
        const namesDesc = await assetsPage.getTableRowNames();

        expect(namesAsc).not.toEqual(namesDesc);
      });

      await test.step('I filter assets', async () => {
        await assetsPage.pickFilterOption('Type', 'Image');
        await expect(assetsPage.getFilterBadges().first()).toBeVisible();
        await assetsPage.removeFilterBadge('Type');
        await expect(assetsPage.getFilterBadges()).toHaveCount(0);
      });

      await test.step('I scroll through a large library', async () => {
        // Enough assets to exceed the 20-item page size regardless of what the
        // with-admin fixture already seeded.                        [CMS-134]
        await assetsPage.uploadFilesWithFilePicker(Array(22).fill(IMAGE));
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        await assetsPage.switchToTableView();
        const initialRows = await assetsPage.getTableRowNames();
        expect(initialRows.length).toBeLessThanOrEqual(20);

        await page.mouse.wheel(0, 20_000);
        await expect
          .poll(async () => (await assetsPage.getTableRowNames()).length)
          .toBeGreaterThan(initialRows.length);

        // A tall enough viewport auto-loads the next page with no manual
        // scroll at all (CMS-1562) — the load-more sentinel is already
        // on-screen the moment the list renders.
        await page.setViewportSize({ width: 1280, height: 2400 });
        await page.reload();
        await assetsPage.switchToTableView();
        await expect
          .poll(async () => (await assetsPage.getTableRowNames()).length)
          .toBeGreaterThan(20);

        // Re-entering the folder after scrolling still shows a correct,
        // complete list rather than a stuck/broken page-1-only view (CMS-1535).
        await assetsPage.getHomeTreeRow().click();
        await assetsPage.navigateIntoFolder('Marketing');
        await assetsPage.getHomeTreeRow().click();
        await page.mouse.wheel(0, 20_000);
        await expect
          .poll(async () => (await assetsPage.getTableRowNames()).length)
          .toBeGreaterThan(20);
      });

      await test.step('I delete a folder', async () => {
        await assetsPage.switchToGridView();
        await assetsPage.createFolder('Empty folder');
        const emptyFolderCard = assetsPage.getFolderCard('Empty folder');
        await emptyFolderCard.getByRole('button', { name: 'More actions' }).click();
        await page.getByRole('menuitem', { name: 'Delete folder' }).click();
        await expect(page.getByText('Delete 1 item?')).toBeVisible();
        await page.getByRole('button', { name: 'Confirm' }).click();
        await expect(emptyFolderCard).not.toBeVisible();

        // deleting a folder containing assets warns of its contents and
        // cascades — hard delete, per the ticket's resolved decision.
        const marketingCard = assetsPage.getFolderCard('Marketing');
        await marketingCard.getByRole('button', { name: 'More actions' }).click();
        await page.getByRole('menuitem', { name: 'Delete folder' }).click();
        await expect(
          page.getByText(/deleting a folder also deletes everything inside it/i)
        ).toBeVisible();
        await page.getByRole('button', { name: 'Confirm' }).click();
        await expect(marketingCard).not.toBeVisible();
      });
    });
  }
);
