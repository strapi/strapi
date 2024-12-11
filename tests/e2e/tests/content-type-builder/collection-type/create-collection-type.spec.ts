import { test } from '@playwright/test';
import { resetFiles } from '../../../utils/file-reset';
import { createCollectionType, type AddAttribute } from '../../../utils/content-types';
import { sharedSetup } from '../../../utils/setup';
import { clickAndWait } from '../../../utils/shared';
import { waitForRestart } from '../../../utils/restart';

test.describe('Create collection type with all field types', () => {
  // very long timeout for these tests because they restart the server multiple times
  test.describe.configure({ timeout: 300000 });

  test.beforeEach(async ({ page }) => {
    await sharedSetup('ctb-edit-st', page, {
      login: true,
      skipTour: true,
      resetFiles: true,
      importData: 'with-admin.tar',
    });

    await clickAndWait(page, page.getByRole('link', { name: 'Content-Type Builder' }));
  });

  // TODO: each test should have a beforeAll that does this, maybe combine all the setup into one util to simplify it
  // to keep other suites that don't modify files from needing to reset files, clean up after ourselves at the end
  test.afterAll(async () => {
    await resetFiles();
  });

  test('Can create a collection type', async ({ page, browserName }) => {
    await clickAndWait(page, page.getByRole('button', { name: 'Create new collection type' }));

    await expect(page.getByRole('heading', { name: 'Create a collection type' })).toBeVisible();

    const displayName = page.getByLabel('Display name');
    await displayName.fill('Secret Document');

    const singularId = page.getByLabel('API ID (Singular)');
    await expect(singularId).toHaveValue('secret-document');

    const pluralId = page.getByLabel('API ID (Plural)');
    await expect(pluralId).toHaveValue('secret-documents');

    // TODO: refactor using the utilities for adding attributes
    await clickAndWait(page, page.getByRole('button', { name: 'Continue' }));

    await expect(page.getByText('Select a field for your collection type')).toBeVisible();

    await clickAndWait(page, page.getByText('Small or long text'));

    await page.getByLabel('Name', { exact: true }).fill('myattribute');
    await clickAndWait(page, page.getByRole('button', { name: 'Finish' }));
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));

    await waitForRestart(page);

    await expect(page.getByRole('heading', { name: 'Secret Document' })).toBeVisible();
  });
});
