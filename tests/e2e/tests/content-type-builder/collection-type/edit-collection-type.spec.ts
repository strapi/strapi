import { test, expect } from '@playwright/test';
import { waitForRestart } from '../../../utils/restart';
import { resetFiles } from '../../../utils/file-reset';
import { navToHeader } from '../../../utils/shared';
import { sharedSetup } from '../../../utils/setup';

test.describe('Edit collection type', () => {
  // very long timeout for these tests because they restart the server multiple times
  test.describe.configure({ timeout: 300000 });

  // use existing type to avoid extra resets and flakiness
  const ctName = 'Article';

  test.beforeEach(async ({ page }) => {
    await resetFiles();
    await sharedSetup('ctb-edit-ct', page, {
      importData: 'with-admin.tar',
      login: true,
      skipTour: true,
      resetFiles: true,
    });

    await navToHeader(page, ['Content-Type Builder', ctName], ctName);
  });

  // TODO: each test should have a beforeAll that does this, maybe combine all the setup into one util to simplify it
  // to keep other suites that don't modify files from needing to reset files, clean up after ourselves at the end
  test.afterEach(async () => {
    await resetFiles();
  });

  // Tests for GH#21398
  test('Can update relation of type manyToOne to oneToOne', async ({ page }) => {
    // Create relation in Content-Type Builder
    await navToHeader(page, ['Content-Type Builder', ctName], ctName);
    await page.getByRole('button', { name: /add another field to this collection type/i }).click();
    await page.getByRole('button', { name: /relation/i }).click();
    await page.getByLabel('Basic settings').getByRole('button').nth(3).click();
    await page.getByRole('button', { name: /article/i }).click();
    await page.getByRole('menuitem', { name: /product/i }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await waitForRestart(page);

    await expect(page.getByRole('cell', { name: 'product', exact: true })).toBeVisible();

    // update relation in Content-Type Builder to oneToOne
    await page.getByRole('button', { name: /edit product/i }).click();
    await page.getByLabel('Basic settings').getByRole('button').nth(0).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);
    await expect(page.getByRole('cell', { name: 'product', exact: true })).toBeVisible();
  });

  test('Can toggle internationalization', async ({ page }) => {
    // toggle off
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Internationalization').click();
    await page.getByRole('button', { name: 'Yes, disable' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await waitForRestart(page);
    await expect(page.getByRole('heading', { name: ctName })).toBeVisible();

    // toggle on - we see that the "off" worked because here it doesn't prompt to confirm data loss
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Internationalization').click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await waitForRestart(page);
    await expect(page.getByRole('heading', { name: ctName })).toBeVisible();
  });

  test('Can toggle draft&publish', async ({ page }) => {
    // toggle off
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Draft & publish').click();
    await page.getByRole('button', { name: 'Yes, disable' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await waitForRestart(page);
    await expect(page.getByRole('heading', { name: ctName })).toBeVisible();

    // toggle on - we see that the "off" worked because here it doesn't prompt to confirm data loss
    await page.getByRole('button', { name: 'Edit' }).first().click();
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

  /**
   * TODO: This test is flaky likely due to an actual display bug
   * where specific circumstances (demonstrated here) cause a modal to close/reopen on the first click
   * instead of triggering the submit
   * */
  test('Can configure advanced settings for multiple fields sequentially', async ({ page }) => {
    const fieldsToAdd = [
      {
        name: 'testfield',
        defaultValue: 'mydefault',
      },
      {
        name: 'testfield2',
        defaultValue: 'mydefault2',
      },
    ];

    for (const field of fieldsToAdd) {
      await page.getByRole('button', { name: 'Add another field', exact: true }).click();
      await page
        .getByRole('button', { name: 'Text Small or long text like title or description' })
        .click();
      await page.getByLabel('Name', { exact: true }).fill(field.name);

      // This ensures that the modal state management correctly resets the active
      // tab when adding/editing multiple fields sequentially
      await expect(page.getByRole('tab', { name: 'Basic settings' })).toHaveAttribute(
        'data-state',
        'active'
      );
      await expect(page.getByRole('tab', { name: 'Advanced settings' })).toHaveAttribute(
        'data-state',
        'inactive'
      );

      await page.getByRole('tab', { name: 'Advanced settings' }).click();
      await page.getByRole('textbox', { name: 'Default value' }).fill(field.defaultValue);
      await page.getByRole('button', { name: 'Finish' }).click();
    }

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

  test('Can enable localization on a content type, create a text field, disable internationalization on the field and enable uniqueness on the same field', async ({
    page,
  }) => {
    // Create a text field
    await page.getByRole('button', { name: 'Add another field', exact: true }).click();
    await page
      .getByRole('button', { name: 'Text Small or long text like title or description' })
      .click();
    await page.getByLabel('Name', { exact: true }).fill('localizedField');
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);
    await expect(page.getByRole('heading', { name: ctName })).toBeVisible();

    // Disable internationalization on the field
    await page.getByRole('button', { name: 'Edit localizedField' }).click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Enable localization for this field').click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);
    await expect(page.getByRole('heading', { name: ctName })).toBeVisible();

    // Enable uniqueness on the field
    await page.getByRole('button', { name: 'Edit localizedField' }).click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Unique field').click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);
    await expect(page.getByRole('heading', { name: ctName })).toBeVisible();
  });
});
