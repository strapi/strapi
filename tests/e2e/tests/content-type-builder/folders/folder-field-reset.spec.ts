import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../../utils/file-reset';
import { waitForRestart } from '../../../../utils/restart';
import { sharedSetup } from '../../../../utils/setup';
import { clickAndWait, navToHeader } from '../../../../utils/shared';

const FOLDER_NAME = 'Reset Folder';
const FOLDERED_TYPE = 'Article';
const ROOT_TYPE = 'Author';
const FOLDER_FIELD_LABEL = 'Select a folder or enter a value to create a new one';

test.describe('Content type folder field', () => {
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    await sharedSetup('ctb-folder-field-reset', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin',
    });

    await clickAndWait(page, page.getByRole('link', { name: 'Content-Type Builder' }));
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('is empty when editing a content type that is not in a folder', async ({ page }) => {
    await page.getByRole('button', { name: 'New Collection-Type' }).click();
    await page.getByRole('menuitem', { name: 'New folder' }).click();

    const folderNameInput = page.getByRole('textbox', { name: 'Folder name' });
    await folderNameInput.fill(FOLDER_NAME);
    await folderNameInput.press('Enter');

    await expect(page.getByRole('button', { name: FOLDER_NAME, exact: true })).toBeVisible();

    // Move a first content type into the folder, so the form holds a folder selection.
    await navToHeader(page, ['Content-Type Builder', FOLDERED_TYPE], FOLDERED_TYPE);
    await clickAndWait(page, page.getByRole('button', { name: 'Edit', exact: true }));
    await page.getByLabel(FOLDER_FIELD_LABEL).click();
    await page.getByRole('option', { name: FOLDER_NAME }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);

    // The next content type edited is still at the root, so it must show no folder.
    await navToHeader(page, ['Content-Type Builder', ROOT_TYPE], ROOT_TYPE);
    await clickAndWait(page, page.getByRole('button', { name: 'Edit', exact: true }));
    await expect(page.getByLabel(FOLDER_FIELD_LABEL)).toHaveValue('');
  });
});
