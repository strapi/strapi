import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { clickAndWait, findAndClose, navToHeader } from '../../../../utils/shared';
import { EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD } from '../../../constants';

test.describe('Edit View', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test.describe('Collection Type - Errors', () => {
    test('as a user I should see an error when trying to publish a document with a required component that is not filled in', async ({
      page,
    }) => {
      await navToHeader(page, ['Content Manager', 'Match'], 'Match');
      await page.getByRole('link', { name: 'Create new entry' }).first().click();

      await page.getByLabel('opponent*').click();
      await page.getByLabel('opponent*').fill('Test');
      await page.getByRole('button', { name: 'No entry yet. Click to add' }).first().click();
      await page.getByRole('button', { name: 'Publish' }).click();

      await expect(
        page.getByText(
          'There are validation errors in your document. Please fix them before saving.'
        )
      ).toBeVisible();
    });

    test('as a user without read permission for a required field, I should see an error when trying to publish', async ({
      page,
    }) => {
      // As super admin create a new draft product entry
      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await page.getByRole('link', { name: 'Products' }).click();
      await page.getByRole('link', { name: 'Create new entry' }).click();

      const slug = 'product-for-required-test';
      await page.getByLabel('slug*').fill(slug);

      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved Document');

      // As super admin remove read permission for the name field for the Editor role
      await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
      await page.getByText('Editor', { exact: true }).click();

      await page.getByLabel('Select all Product permissions').click();
      await page.getByRole('button', { name: 'Product' }).click();
      await page.getByLabel('Select name Read permission').click();

      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved');

      await page.getByRole('button', { name: 'test testing' }).click();
      await page.getByRole('menuitem', { name: 'Log out' }).click();

      // As editor login and try to publish the entry
      await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });

      await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
      await page.getByRole('link', { name: 'Products' }).click();
      await page.getByText(slug).click();
      await page.getByRole('button', { name: 'Publish' }).click();

      await expect(
        page.getByText(
          'Your current permissions prevent access to certain required fields. Please request access from an administrator to proceed.'
        )
      ).toBeVisible();
    });
  });
});
