import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../../utils/file-reset';
import { createCollectionType } from '../../../../utils/content-types';
import { sharedSetup } from '../../../../utils/setup';
import { clickAndWait, navToHeader } from '../../../../utils/shared';

const FOLDER_NAME = 'Persistence Folder';
const CONTENT_TYPE_NAME = 'Foldered Article';

test.describe('Content type folder assignment persistence', () => {
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    await sharedSetup('ctb-folder-persistence', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin',
    });

    await clickAndWait(page, page.getByRole('link', { name: 'Content-Type Builder' }));
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('keeps a content type inside its folder after save and restart', async ({ page }) => {
    await page.getByRole('button', { name: 'New Collection-Type' }).click();
    await page.getByRole('menuitem', { name: 'New folder' }).click();

    const folderNameInput = page.getByRole('textbox', { name: 'Folder name' });
    await folderNameInput.fill(FOLDER_NAME);
    await folderNameInput.press('Enter');

    await expect(page.getByRole('button', { name: FOLDER_NAME })).toBeVisible();

    await createCollectionType(page, {
      name: CONTENT_TYPE_NAME,
      folder: FOLDER_NAME,
      attributes: [{ type: 'text', name: 'title' }],
    });

    await navToHeader(page, ['Content Manager', CONTENT_TYPE_NAME], CONTENT_TYPE_NAME);

    const folderToggle = page.getByRole('button', { name: FOLDER_NAME });
    await expect(folderToggle).toBeVisible();
    if ((await folderToggle.getAttribute('aria-expanded')) !== 'true') {
      await folderToggle.click();
    }

    const folderRegionId = await folderToggle.getAttribute('aria-controls');
    const folderRegion = page.locator(`[id="${folderRegionId}"]`);
    await expect(folderRegion.getByRole('link', { name: CONTENT_TYPE_NAME })).toBeVisible();
  });
});
