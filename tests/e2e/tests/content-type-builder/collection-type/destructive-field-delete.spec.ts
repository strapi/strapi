import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../../utils/file-reset';
import { sharedSetup } from '../../../../utils/setup';
import { clickAndWait, navToHeader, findAndClose } from '../../../../utils/shared';
import { fillField } from '../../../../utils/content-creation';
import { waitForRestart } from '../../../../utils/restart';

// Critical path #4 deep — ctb.edit-schema.destructive-changes-warn (@extended)
//
// Deleting a field that conditional fields depend on is a destructive change: the CTB warns before
// allowing it. This test creates an entry holding data, deletes the depended-on field (`likesCats`,
// which `bestFriendCats` and `preferredCatPersonality` are conditional on), confirms the warning,
// and verifies the schema change applies cleanly while the entry's surviving data is preserved.
test.describe(
  'CTB - Destructive schema change warns and preserves data',
  { tag: ['@extended'] },
  () => {
    // Long timeout — triggers a server restart
    test.describe.configure({ timeout: 500000 });

    test.beforeEach(async ({ page }) => {
      await sharedSetup('ctb-destructive-field-delete', page, {
        resetFiles: true,
        importData: 'with-admin',
        login: true,
        resetAlways: true,
      });
    });

    test.afterAll(async () => {
      await resetFiles();
    });

    test('Deleting a field that conditional fields depend on warns, then preserves other data', async ({
      page,
    }) => {
      // 1. Create a Dog entry holding data, including a value in the field we will delete.
      await navToHeader(page, ['Content Manager', 'Dog'], 'Dog');
      await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
      await fillField(page, { name: 'name*', type: 'text', value: 'Rex' });
      await fillField(page, { name: 'likesCats', type: 'boolean', value: true });
      await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
      await findAndClose(page, 'Saved Document');

      // 2. In the CTB, delete `likesCats` — `bestFriendCats` and `preferredCatPersonality` are
      //    conditional on it, so this is a destructive change.
      await navToHeader(page, ['Content-Type Builder', 'Dog'], 'Dog');
      await clickAndWait(page, page.getByRole('button', { name: 'Delete likesCats' }));

      // 3. The warning dialog lists the dependent fields and asks for confirmation.
      const dialog = page.getByRole('alertdialog');
      await expect(dialog).toContainText('conditions that depend on this field');
      await dialog.getByRole('button', { name: 'Confirm' }).click();

      // 4. Persist the schema change.
      await page.getByRole('button', { name: 'Save' }).click();
      await waitForRestart(page);

      // 5a. The field is gone from the schema (its delete control no longer exists).
      await expect(page.getByRole('button', { name: 'Delete likesCats' })).toHaveCount(0);

      // 5b. Clean DB state: the entry still exists with its surviving data intact.
      await navToHeader(page, ['Content Manager', 'Dog'], 'Dog');
      await clickAndWait(page, page.getByRole('gridcell', { name: 'Rex' }));
      await expect(page.getByRole('textbox', { name: 'name' })).toHaveValue('Rex');
    });
  }
);
