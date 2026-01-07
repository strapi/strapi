import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { login } from '../../../../utils/login';
import { createContent, fillField } from '../../../../utils/content-creation';
import { navToHeader } from '../../../../utils/shared';

test.describe('Boolean Component - Clear Button Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
    await navToHeader(page, ['Content Manager'], 'Content Manager');
  });

  test('Clear button does NOT appear for required boolean fields', async ({ page }) => {
    await createContent(
      page,
      'Products',
      [{ name: 'name*', type: 'text', value: 'Boolean Clear Test Product' }],
      { save: false, publish: false, verify: false }
    );
    const booleanFieldContainer = page.getByRole('checkbox', { name: 'isAvailable' });
    const clearButton = page.getByRole('button', { name: 'Clear' });

    // Check that the field is required and has a default value (true)
    await expect(booleanFieldContainer).toBeChecked();

    // Clear button should NEVER be visible for required fields, even when they have values
    await expect(clearButton).not.toBeVisible();

    // Set to false and verify clear button still doesn't appear
    await fillField(page, { name: 'isAvailable', type: 'boolean', value: false });
    await expect(clearButton).not.toBeVisible();

    // Set back to true and verify clear button still doesn't appear
    await fillField(page, { name: 'isAvailable', type: 'boolean', value: true });
    await expect(clearButton).not.toBeVisible();
  });

  test('Clear button appears only when not required and value is not null', async ({ page }) => {
    await createContent(
      page,
      'Cat',
      [{ name: 'name*', type: 'text', value: 'Boolean Clear Test Cat' }],
      { save: false, publish: false, verify: false }
    );
    const booleanFieldContainer = page.getByRole('checkbox', { name: 'likesDogs' });
    const clearButton = page.getByRole('button', { name: 'Clear' });
    await booleanFieldContainer.check();
    await expect(clearButton).toBeVisible();
    // Set to true
    await fillField(page, { name: 'likesDogs', type: 'boolean', value: true });
    await expect(clearButton).toBeVisible();
    // Set to false
    await fillField(page, { name: 'likesDogs', type: 'boolean', value: false });
    await expect(clearButton).toBeVisible();
    // Clear to null
    await clearButton.click();
    await expect(clearButton).not.toBeVisible();
  });

  test('Clear button sets value to null and persists after save', async ({ page }) => {
    await createContent(
      page,
      'Cat',
      [{ name: 'name*', type: 'text', value: 'Boolean Clear Persist Cat' }],
      { save: false, publish: false, verify: false }
    );
    const booleanFieldContainer = page.getByRole('checkbox', { name: 'likesDogs' });
    const clearButton = page.getByRole('button', { name: 'Clear' });
    await booleanFieldContainer.check();
    // Set to true
    await fillField(page, { name: 'likesDogs', type: 'boolean', value: true });
    await expect(clearButton).toBeVisible();
    await expect(booleanFieldContainer).toBeChecked();
    // Clear to null
    await clearButton.click();
    await expect(booleanFieldContainer).not.toBeChecked();
    // Save and reload
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 10000 });
    await page.reload();
    await navToHeader(page, ['Content Manager', 'Cat'], 'Cat');
    await page.getByRole('gridcell', { name: 'Boolean Clear Persist Cat' }).click();
    await expect(booleanFieldContainer).not.toBeChecked();
    await expect(clearButton).not.toBeVisible();
  });
});
