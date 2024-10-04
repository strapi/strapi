import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { waitForRestart } from '../../../utils/restart';
import { resetFiles } from '../../../utils/file-reset';
import {
  createSingleType,
  describeOnCondition,
  navToHeader,
  skipCtbTour,
} from '../../../utils/shared';
import { sharedSetup } from '../../../utils/setup';

test.describe('Edit single type', () => {
  // very long timeout for these tests because they restart the server multiple times
  test.describe.configure({ timeout: 300000 });

  // use a name with a capital and a space to ensure we also test the kebab-casing conversion for api ids
  const ctName = 'Secret Document';

  test.beforeEach(async ({ page }) => {
    await sharedSetup('ctb-edit-st', page, {
      login: true,
      skipTour: true,
      resetFiles: true,
      importData: 'with-admin.tar',
      afterSetup: async () => {
        await createSingleType(page, {
          name: ctName,
        });
      },
    });

    // Then go to our content type
    await navToHeader(page, ['Content-Type Builder', ctName], ctName);
  });

  // TODO: each test should have a beforeAll that does this, maybe combine all the setup into one util to simplify it
  // to keep other suites that don't modify files from needing to reset files, clean up after ourselves at the end
  test.afterAll(async () => {
    await resetFiles();
  });

  test('Can toggle internationalization', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Internationalization').click();
    await page.getByRole('button', { name: 'Finish' }).click();

    await waitForRestart(page);

    await expect(page.getByRole('heading', { name: 'Secret Document' })).toBeVisible();
  });

  test('Can toggle draft&publish', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Draft & publish').click();
    await page.getByRole('button', { name: 'Yes, disable' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();

    await waitForRestart(page);

    await expect(page.getByRole('heading', { name: 'Secret Document' })).toBeVisible();
  });

  test('Can add a field with default value', async ({ page }) => {
    await page.getByRole('button', { name: 'Add another field', exact: true }).click();
    await page
      .getByRole('button', { name: 'Text Small or long text like title or description' })
      .click();
    await page.getByLabel('Name', { exact: true }).fill('testfield');
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByRole('textbox', { name: 'Default value' }).fill('mydefault');
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await waitForRestart(page);

    await expect(page.getByRole('heading', { name: 'Secret Document' })).toBeVisible();
  });
});
