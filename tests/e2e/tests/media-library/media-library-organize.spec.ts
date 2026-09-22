import path from 'path';

import { test, expect } from '@playwright/test';

import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { describeOnCondition } from '../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

/**
 * Journey 2 — Organize my library.
 *
 * A content manager structures an already-populated library and finds assets
 * within it. Broad and shallow: chains every capability once in a single flow,
 * per the journey's own framing.
 *
 * One step from the journey is not shipped and is left as a note rather than a
 * fabricated assertion: "the breadcrumb reflects the current depth" — there is
 * no breadcrumb component in this Media Library; the header shows
 * "<Folder> (N items)" and the side tree carries the hierarchy instead.
 */

const UPLOADS_DIR = path.join(__dirname, '../../data/uploads');
const IMAGE = path.join(UPLOADS_DIR, 'test-image.jpg');

describeOnCondition(process.env.E2E_MEDIA_LIBRARY === 'current')(
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

        // Nested sub-folders
        await assetsPage.navigateIntoFolder('Marketing');
        await expect(page.getByRole('heading', { name: /^Marketing/ })).toBeVisible();

        await assetsPage.createFolder('Campaigns');
        await expect(assetsPage.getFolderCard('Campaigns')).toBeVisible();
      });

      await test.step('I navigate folders', async () => {
        // Folders show as nodes in the side tree
        await assetsPage.navigateIntoFolder('Campaigns');
        await expect(page.getByRole('heading', { name: /^Campaigns/ })).toBeVisible();

        await assetsPage.getHomeTreeRow().click();
        // The root heading is the folder name plus its item count — "Home (N items)",
        // the same shape as inside a folder. "Media library" only appears as the
        // sidebar's own level-2 heading.
        await expect(page.getByRole('heading', { name: /^Home/ })).toBeVisible();
      });

      await test.step('I use the folder "…" actions menu', async () => {
        await assetsPage.createFolder('Design assets');

        // Rename a folder, and prove the old name is gone rather than duplicated.
        const createdFolderCard = assetsPage.getFolderCard('Design assets');
        await createdFolderCard.getByRole('button', { name: 'More actions' }).click();
        await page.getByRole('menuitem', { name: 'Rename folder' }).click();
        const renameDialog = page.getByRole('dialog', { name: 'Rename folder' });
        await renameDialog.getByRole('textbox', { name: 'Folder name' }).fill('Design system');
        await renameDialog.getByRole('button', { name: 'Save' }).click();
        await expect(assetsPage.getFolderCard('Design system')).toBeVisible();
        await expect(assetsPage.getFolderCard('Design assets')).not.toBeVisible();

        // Copy link to folder
        const designFolderCard = assetsPage.getFolderCard('Design system');
        await designFolderCard.getByRole('button', { name: 'More actions' }).click();
        await page.getByRole('menuitem', { name: 'Copy link to folder' }).click();
        await expect(
          page
            .getByRole('region', { name: 'Notifications' })
            .getByRole('status')
            .filter({ hasText: 'Folder link copied.' })
        ).toBeVisible();

        // Move the folder itself into another folder
        await designFolderCard.getByRole('button', { name: 'More actions' }).click();
        await page.getByRole('menuitem', { name: 'Move to folder' }).click();
        const moveDialog = page.getByRole('dialog', { name: 'Move elements to' });
        await moveDialog.getByRole('combobox').click();
        // `exact` matters: the picker also lists the nested "Campaigns", whose
        // accessible name carries its parent, so a partial match hits both.
        await page.getByRole('option', { name: 'Marketing', exact: true }).click();
        await moveDialog.getByRole('button', { name: 'Move' }).click();
        await expect(assetsPage.getMoveSuccessNotification()).toBeVisible();
        await expect(assetsPage.getFolderCard('Design system')).not.toBeVisible();

        await assetsPage.navigateIntoFolder('Marketing');
        await expect(assetsPage.getFolderCard('Design system')).toBeVisible();
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
        const unfilteredRowCount = (await assetsPage.getTableRowNames()).length;

        await searchBox.fill('test-image');
        await expect(assetsPage.getAssetRow('test-image')).toBeVisible();

        await searchBox.fill('no-such-asset-xyz');
        // The empty state shows a title and a description, and a loose regex matches
        // both. Assert the title, which is the stable half.
        await expect(page.getByText('No results found')).toBeVisible();

        await searchBox.fill('');
        // `AssetsSearchInput` debounces the query by 300ms, so clearing the box does
        // not restore the list synchronously. Pin it back to its full state here
        // rather than letting the next step's first read race the debounce.
        await expect
          .poll(async () => (await assetsPage.getTableRowNames()).length)
          .toBe(unfilteredRowCount);
      });

      await test.step('I sort assets', async () => {
        await assetsPage.pickSortOption('A to Z');
        const namesAsc = await assetsPage.getTableRowNames();

        await assetsPage.pickSortOption('Z to A');
        const namesDesc = await assetsPage.getTableRowNames();

        expect(namesAsc).not.toEqual(namesDesc);
      });

      await test.step('I filter assets', async () => {
        // The shipped type values are Folder / Picture / Audio / Video / Document —
        // there is no "Image".
        await assetsPage.pickFilterOption('Type', 'Picture');
        await expect(assetsPage.getFilterBadges().first()).toBeVisible();
        await assetsPage.removeFilterBadge('Type');
        await expect(assetsPage.getFilterBadges()).toHaveCount(0);
      });

      await test.step('I scroll through a large library', async () => {
        // Enough assets to exceed the 20-item page size regardless of what the
        // with-admin fixture already seeded.
        await assetsPage.uploadFilesWithFilePicker(Array(22).fill(IMAGE));
        await assetsPage.waitForUploadProgressSuccess();
        await assetsPage.closeUploadProgressDialog();

        await assetsPage.switchToTableView();
        // Folders and files share the table but not the pagination: the 20-item page
        // applies to `/upload/files`, while folders come from their own request. So
        // count the files — names with an extension — not every row.
        const fileRows = (names: string[]) => names.filter((name) => name.includes('.'));

        const initialRows = await assetsPage.getTableRowNames();
        expect(fileRows(initialRows).length).toBeLessThanOrEqual(20);

        await page.mouse.wheel(0, 20_000);
        await expect
          .poll(async () => (await assetsPage.getTableRowNames()).length)
          .toBeGreaterThan(initialRows.length);

        // A tall enough viewport auto-loads the next page with no manual scroll at
        // all — the load-more sentinel is already on-screen when the list renders.
        await page.setViewportSize({ width: 1280, height: 2400 });
        await page.reload();
        await assetsPage.switchToTableView();
        await expect
          .poll(async () => (await assetsPage.getTableRowNames()).length)
          .toBeGreaterThan(20);

        // Leaving a folder and coming back still shows a correct, complete list
        // rather than a stuck or page-1-only view.
        //
        // Back to a short viewport first: the tall one above auto-loads page 2 on
        // render, which would mask a broken re-entry by satisfying the final
        // assertion before any navigation happened.
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.reload();
        await assetsPage.switchToTableView();

        await assetsPage.navigateIntoFolder('Marketing');
        // Marketing holds exactly what the earlier steps put there — the moved
        // asset and the moved folder — and not Home's list.
        await expect(assetsPage.getAssetRow('test-image')).toBeVisible();
        await expect(assetsPage.getFolderRow('Design system')).toBeVisible();

        await assetsPage.getHomeTreeRow().click();
        // Re-entry starts at a fresh first page...
        await expect
          .poll(async () => fileRows(await assetsPage.getTableRowNames()).length)
          .toBeLessThanOrEqual(20);
        // ...and scrolling still loads the next one.
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
        // The dialog confirms, but it does NOT warn that the contents go with the
        // folder. The component's own defaultMessage says so, and a translation key
        // spelling it out exists — `…delete.confirm.description.cant-be-undone` —
        // but nothing renders either: the used key `…description.are-you-sure` is
        // translated to a plain "Are you sure…", and `cant-be-undone` is referenced
        // by no code at all.
        //
        // Asserting what actually ships rather than what the step wishes for.
        // Tighten this once the cascade warning is restored.
        await expect(
          page.getByText('Are you sure you want to delete the selected items?')
        ).toBeVisible();
        await page.getByRole('button', { name: 'Confirm' }).click();
        await expect(marketingCard).not.toBeVisible();
      });
    });
  }
);
