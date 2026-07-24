import { test, expect } from '@playwright/test';
import path from 'path';

import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { describeOnCondition } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

const FIXTURE_IMAGE_1 = path.join(__dirname, '../../../data/uploads/test-image-1.jpg');
const FIXTURE_IMAGE_2 = path.join(__dirname, '../../../data/uploads/test-image-2.jpg');

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')('Media Library - Sort', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('sorts assets alphabetically in both directions', async ({ page }) => {
    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();

    await assetsPage.uploadFilesWithFilePicker([FIXTURE_IMAGE_1, FIXTURE_IMAGE_2]);
    await assetsPage.waitForUploadSuccess();
    await assetsPage.switchToTableView();

    // Default state advertised on the trigger.
    await expect(assetsPage.getSortMenuTrigger()).toHaveText(/Most recent updates/);

    // Alphabetical — picking a direction replaces the date sort (mutually exclusive).
    await assetsPage.pickSortOption('A to Z');

    await expect(assetsPage.getAssetRow('test-image-1.jpg')).toBeVisible();
    let names = await assetsPage.getTableRowNames();
    expect(names.indexOf('test-image-1.jpg')).toBeLessThan(names.indexOf('test-image-2.jpg'));

    // Flip to Z to A — order inverts.
    await assetsPage.pickSortOption('Z to A');
    await expect(assetsPage.getAssetRow('test-image-1.jpg')).toBeVisible();
    names = await assetsPage.getTableRowNames();
    expect(names.indexOf('test-image-2.jpg')).toBeLessThan(names.indexOf('test-image-1.jpg'));
  });

  test('mixes folders with files according to the sort rule', async ({ page }) => {
    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();

    // "test-image-15" sorts between "test-image-1.jpg" and "test-image-2.jpg".
    await assetsPage.createFolder('test-image-15');
    await assetsPage.waitForUploadSuccess();
    await assetsPage.uploadFilesWithFilePicker([FIXTURE_IMAGE_1, FIXTURE_IMAGE_2]);
    await assetsPage.waitForUploadSuccess();
    await assetsPage.switchToTableView();

    await assetsPage.pickSortOption('A to Z');

    // Folders on top (default): folder first regardless of name.
    let names = await assetsPage.getTableRowNames();
    expect(names[0]).toBe('test-image-15');

    // Mixed: the folder slots between the two files alphabetically.
    await assetsPage.pickSortOption('Mixed with files');
    await expect(assetsPage.getAssetRow('test-image-1.jpg')).toBeVisible();
    names = await assetsPage.getTableRowNames();
    expect(names).toEqual(['test-image-1.jpg', 'test-image-15', 'test-image-2.jpg']);
  });

  test('restores the sort from the URL after a reload', async ({ page }) => {
    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();

    await assetsPage.uploadFilesWithFilePicker(FIXTURE_IMAGE_1);
    await assetsPage.waitForUploadSuccess();

    await assetsPage.pickSortOption('Oldest uploads');
    await expect(page).toHaveURL(/sort=createdAt%3AASC|sort=createdAt:ASC/);

    await page.reload();

    await expect(assetsPage.getSortMenuTrigger()).toHaveText(/Oldest uploads/);
  });
});
