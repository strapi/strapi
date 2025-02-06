import { test, expect } from '@playwright/test';
import { waitForRestart } from '../../../utils/restart';
import { resetFiles } from '../../../utils/file-reset';
import { navToHeader } from '../../../utils/shared';
import { sharedSetup } from '../../../utils/setup';
import { createSingleType } from '../../../utils/content-types';

test.describe('Edit single type', () => {
  // very long timeout for these tests because they restart the server multiple times
  test.describe.configure({ timeout: 300000 });

  // Use the existing single-type from our test data
  const ctName = 'Homepage';

  test.beforeEach(async ({ page }) => {
    await sharedSetup('ctb-edit-st', page, {
      login: true,
      skipTour: true,
      resetFiles: true,
      importData: 'with-admin.tar',
    });

    // Then go to our content type
    await navToHeader(page, ['Content-Type Builder', ctName], ctName);
  });

  // TODO: each test should have a beforeAll that does this, maybe combine all the setup into one util to simplify it
  // to keep other suites that don't modify files from needing to reset files, clean up after ourselves at the end
  test.afterEach(async ({ page }) => {
    await resetFiles();
  });

  test('Can toggle internationalization', async ({ page }) => {
    // toggle off
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Internationalization').click();
    await page.getByRole('button', { name: 'Yes, disable' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await waitForRestart(page);
    await expect(page.getByRole('heading', { name: ctName })).toBeVisible();

    // toggle on - we see that the "off" worked because here it doesn't prompt to confirm data loss
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Internationalization').click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await waitForRestart(page);
    await expect(page.getByRole('heading', { name: ctName })).toBeVisible();
  });

  test('Can toggle draft&publish', async ({ page }) => {
    // toggle off
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Draft & publish').click();
    await page.getByRole('button', { name: 'Yes, disable' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await waitForRestart(page);
    await expect(page.getByRole('heading', { name: ctName })).toBeVisible();

    // toggle on - we see that the "off" worked because here it doesn't prompt to confirm data loss
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Draft & publish').click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await waitForRestart(page);
    await expect(page.getByRole('heading', { name: ctName })).toBeVisible();
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

    await expect(page.getByRole('heading', { name: ctName })).toBeVisible();
  });

  test('Can change type name', async ({ page }) => {
    const newname = 'New name';
    await page.getByRole('button', { name: 'Edit', exact: true }).click();

    await page.getByRole('textbox', { name: 'Display name' }).fill(newname);

    await page.getByRole('button', { name: 'Finish', exact: true }).click();

    await waitForRestart(page);

    await expect(page.getByRole('heading', { name: newname })).toBeVisible();
  });

  test('Can delete type', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();

    // need to accept the browser modal
    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await waitForRestart(page);

    await expect(page.getByRole('heading', { name: ctName })).not.toBeVisible();
  });
});
