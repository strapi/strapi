import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { login } from '../../../../utils/login';
import { createContent, fillField } from '../../../../utils/content-creation';
import { findAndClose, navToHeader } from '../../../../utils/shared';

test.describe('Conditional Fields - Boolean-controlled conditional relation fields and select relation', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });

    await navToHeader(page, ['Content Manager'], 'Content Manager');
  });

  test('As a user I can select relations in conditional fields and save them successfully', async ({
    page,
  }) => {
    // Create a cat first
    await navToHeader(page, ['Content Manager', 'Cat'], 'Cat');
    await page.getByRole('link', { name: 'Create new entry' }).last().click();

    await fillField(page, { name: 'name*', type: 'text', value: 'Whiskers' });
    await fillField(page, { name: 'age', type: 'number', value: 3 });
    await fillField(page, { name: 'personality', type: 'enumeration', value: 'friendly' });

    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved Document');

    // Navigate to Dogs
    await navToHeader(page, ['Content Manager', 'Dog'], 'Dog');
    await page.getByRole('link', { name: 'Create new entry' }).last().click();

    await fillField(page, { name: 'name*', type: 'text', value: 'Luna' });
    await fillField(page, { name: 'age', type: 'number', value: 1 });
    await fillField(page, { name: 'likesCats', type: 'boolean', value: true });

    // bestFriendCats relation should be visible
    await expect(page.getByLabel('bestFriendCats')).toBeVisible();

    // Add Whiskers as a friend - relation fields use combobox
    await page.getByLabel('bestFriendCats').click();
    await page.getByText('Whiskers').click();

    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved Document');

    // Verify the relation was saved
    await expect(page.getByText('Whiskers')).toBeVisible();
  });
});
