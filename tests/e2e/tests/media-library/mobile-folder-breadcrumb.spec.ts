import { test, expect } from '@playwright/test';
import { loginWithApi } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { AssetsPage } from './page-objects/AssetsPage';
import { describeOnCondition } from '../../../utils/shared';

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const MIN_TAP_TARGET = 44;

describeOnCondition(process.env.E2E_MEDIA_LIBRARY === 'current')(
  'Media Library - Mobile folder breadcrumb',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await loginWithApi({ page });
      await page.goto('/admin');
    });

    test('climbs back to the parent folders from the page header', async ({ page }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await assetsPage.createFolder('Parent');
      await assetsPage.waitForNotification();
      await assetsPage.switchToGridView();
      await assetsPage.navigateIntoFolder('Parent');
      await assetsPage.createFolder('Child');
      await assetsPage.waitForNotification();
      await assetsPage.navigateIntoFolder('Child');

      // Below the breakpoint that hides the folder tree.
      await page.setViewportSize(MOBILE_VIEWPORT);

      const heading = page.getByRole('heading', { level: 1 });
      const breadcrumb = page.getByRole('navigation', { name: 'Folder navigation' });

      await expect(heading).toHaveAccessibleName('Child');
      await expect(page.getByText('0 items', { exact: true })).toBeVisible();

      const home = breadcrumb.getByRole('button', { name: 'Home' });
      const homeBox = await home.boundingBox();
      expect(homeBox?.width).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
      expect(homeBox?.height).toBeGreaterThanOrEqual(MIN_TAP_TARGET);

      const newBox = await assetsPage.newButton.boundingBox();
      const centerY = (box: typeof homeBox) => (box ? box.y + box.height / 2 : NaN);
      expect(Math.abs(centerY(homeBox) - centerY(newBox))).toBeLessThanOrEqual(1);

      const moreFolders = breadcrumb.getByRole('button', { name: 'Show more folders' });
      const moreFoldersBox = await moreFolders.boundingBox();
      expect(moreFoldersBox?.width).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
      expect(moreFoldersBox?.height).toBeGreaterThanOrEqual(MIN_TAP_TARGET);

      await moreFolders.click();
      await expect(page.getByRole('menuitem')).toHaveText(['Parent']);
      await page.getByRole('menuitem', { name: 'Parent' }).click();

      await expect(heading).toHaveAccessibleName('Parent');
      await expect(moreFolders).toBeHidden();

      await home.click();

      await expect(heading).toHaveAccessibleName(/^Home \(/);
      await expect(breadcrumb).toBeHidden();
    });
  }
);
