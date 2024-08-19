import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { waitForRestart } from '../../../utils/restart';
import { resetFiles } from '../../../utils/file-reset';

test.describe('Create collection type', () => {
  test.beforeEach(async ({ page }) => {
    await resetFiles();
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });

    await page.getByRole('link', { name: 'Content-Type Builder' }).click();

    // close the tutorial modal if it's visible
    const modal = page.getByRole('button', { name: 'Close' });
    if (modal.isVisible()) {
      await modal.click();
      await expect(modal).not.toBeVisible();
    }
  });

  // TODO: each test should have a beforeAll that does this, maybe combine all the setup into one util to simplify it
  // to keep other suites that don't modify files from needing to reset files, clean up after ourselves at the end
  test.afterAll(async () => {
    await resetFiles();
  });

  test('Can create a collection type', async ({ page, browserName }) => {
    await page.getByRole('button', { name: 'Create new collection type' }).click();

    await expect(page.getByRole('heading', { name: 'Create a collection type' })).toBeVisible();

    const displayName = page.getByLabel('Display name');
    await displayName.fill('Secret Document');

    const singularId = page.getByLabel('API ID (Singular)');
    await expect(singularId).toHaveValue('secret-document');

    const pluralId = page.getByLabel('API ID (Plural)');
    await expect(pluralId).toHaveValue('secret-documents');

    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText('Select a field for your collection type')).toBeVisible();

    // TODO: fix the bug that causes webkit location to be off
    if (browserName === 'webkit') {
      return test.fixme();
    }

    await page.getByText('Small or long text').click();

    await page.getByLabel('Name', { exact: true }).fill('myattribute');
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await waitForRestart(page);

    await expect(page.getByRole('heading', { name: 'Secret Document' })).toBeVisible();
  });
});
