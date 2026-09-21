import { test, expect } from '@playwright/test';

import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { describeOnCondition } from '../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

describeOnCondition(process.env.E2E_MEDIA_LIBRARY === 'current')('Media Library - Crop', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('crops an image and applies it to the original', async ({ page }) => {
    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();
    await assetsPage.switchToGridView();
    await assetsPage.clickAssetInGrid('ted_lasso_profile.jpeg');
    await expect(assetsPage.assetDetailsDrawer).toBeVisible();

    await assetsPage.openCropEditor();
    // Default crop area = full image; Apply replaces the binary.
    await assetsPage.applyCrop();

    await expect(assetsPage.getDrawerToast(/File cropped/i)).toBeVisible({ timeout: 10000 });
    await expect(assetsPage.assetDetailsDrawer).toBeVisible();
  });

  test('keeps the image filling the crop area after rotating', async ({ page }) => {
    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();
    await assetsPage.switchToGridView();
    await assetsPage.clickAssetInGrid('ted_lasso_profile.jpeg');
    await expect(assetsPage.assetDetailsDrawer).toBeVisible();

    await assetsPage.openCropEditor();

    // The editor renders in a Portal, so `[role=dialog] img` would match the drawer's
    // preview thumbnail behind it rather than the image under test.
    const editorImage = page.getByTestId('crop-editor-image');

    /**
     * Two failure modes this guards, neither of which jsdom can see because it has
     * no layout:
     *  - a quarter turn takes the image out of flow, so the crop area (a flex item
     *    sized by that image) collapses and everything disappears;
     *  - the admin's global `img { max-width: 100% }` squares off the reciprocal
     *    sizing, so the image no longer covers the rotated area.
     */
    const boxes = async () =>
      page.evaluate(() => {
        const img = document.querySelector('[data-testid="crop-editor-image"]');
        const area = img?.parentElement;
        if (!img || !area) return null;
        const a = img.getBoundingClientRect();
        const b = area.getBoundingClientRect();
        return { img: { w: a.width, h: a.height }, area: { w: b.width, h: b.height } };
      });

    // Four consecutive right turns walk 90 -> 180 -> 270 -> 0, so the half turn is
    // covered too: it is the one rotation that must stay in flow.
    for (const name of ['Rotate right', 'Rotate right', 'Rotate right', 'Rotate right']) {
      await page.getByRole('button', { name }).click();
      await expect(editorImage).toBeVisible();

      // Polled rather than measured once: the click re-renders and styled-components
      // swaps the class, so a single read can land before the new layout applies.
      await expect
        .poll(
          async () => {
            const measured = await boxes();
            if (!measured) return null;
            return {
              collapsed: measured.area.w === 0 || measured.area.h === 0,
              fills:
                Math.abs(measured.img.w - measured.area.w) <= 1 &&
                Math.abs(measured.img.h - measured.area.h) <= 1,
            };
          },
          { message: `image should fill the crop area after "${name}"` }
        )
        .toEqual({ collapsed: false, fills: true });
    }
  });

  test('crops an image and saves it as a copy in the same folder', async ({ page }) => {
    const assetsPage = new AssetsPage(page);
    await assetsPage.goto();
    await assetsPage.switchToGridView();
    await assetsPage.clickAssetInGrid('ted_lasso_profile.jpeg');
    await expect(assetsPage.assetDetailsDrawer).toBeVisible();

    await assetsPage.openCropEditor();
    await assetsPage.saveCropAsCopy();

    await expect(assetsPage.getDrawerToast(/Copy created/i)).toBeVisible({ timeout: 10000 });
  });
});
