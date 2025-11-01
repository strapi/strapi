import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { navToHeader, findAndClose } from '../../../utils/shared';
import { waitForRestart } from '../../../utils/restart';

test.describe('Edit View - Enumeration Fields Testing', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('should test enumeration fields - required vs non-required behavior', async ({ page }) => {
    // Navigate to Content Manager
    await navToHeader(page, ['Content-Type Builder', 'Cat'], 'Cat');

    await page.getByRole('button', { name: 'Add another field', exact: true }).click();
    await page.getByRole('button', { name: 'Enumeration' }).click();
    await page.getByLabel('Name', { exact: true }).fill('hair');
    await page.getByLabel('Values (one line per value)').fill('White\nBlack');
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByLabel('Required field').click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);

    // Go to the content manager and create a new entry
    await navToHeader(page, ['Content Manager', 'Cat'], 'Cat');
    await page.getByRole('link', { name: 'Create new entry' }).first().click();

    await page.getByLabel('name*').fill('Zoe');
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'There are validation errors', { role: 'alert' });

    await page.getByRole('combobox', { name: 'hair' }).click();
    await page.getByRole('option', { name: 'White' }).click();

    await page.getByRole('combobox', { name: 'personality' }).click();
    await page.getByRole('option', { name: 'friendly' }).click();

    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published document');

    // Reset "personality" combobox value
    await page.getByRole('combobox', { name: 'personality' }).click();
    await page.getByRole('option', { name: 'Choose here' }).click();

    // Reset option should not be clickable in "hair" combobox
    await page.getByRole('combobox', { name: 'hair' }).click();
    await expect(page.getByRole('option', { name: 'Choose here' })).toBeDisabled();
    await page.getByRole('option', { name: 'White' }).click();

    await page.getByRole('button', { name: 'Publish' }).click();

    await findAndClose(page, 'Published document');

    // Clean Cat content type
    await navToHeader(page, ['Content-Type Builder', 'Cat'], 'Cat');
    await page.getByRole('button', { name: 'Delete hair' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);
  });
});
