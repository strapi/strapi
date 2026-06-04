import { test, expect } from '@playwright/test';

import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';

test.describe('i18n - Fill from another locale', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('As a user I want to retrieve localized relations with the fill from another locale feature', async ({
    page,
  }) => {
    /**
     * First case: the relation item wasn't created in the requested locale
     */
    await navToHeader(page, ['Content Manager', 'Shop'], 'UK Shop');

    /**
     * Select a product from the product carousel
     */
    await page.getByRole('button', { name: 'Product carousel - 23/24 kits' }).click();
    await page.getByRole('combobox', { name: 'products' }).click();
    await page.getByText('Nike Mens 23/24 Away Stadium').click();

    /**
     * Publish the document
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published document');

    /**
     * Switch to Spanish locale to create a new locale entry (empty form)
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();

    /**
     * Now we should be on a new document in the es locale with empty form
     */
    expect(new URL(page.url()).searchParams.get('plugins[i18n][locale]')).toEqual('es');
    await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
    await expect(page.locator('input[name="title"]')).toHaveValue('');

    /**
     * Open "More document actions" and click "Fill in from another locale"
     */
    await page.getByRole('button', { name: 'Fill in from another locale' }).click();
    await page.getByRole('combobox', { name: 'Locale' }).click();
    await page.locator('span').filter({ hasText: 'English (en)' }).first().click();
    await page.getByRole('button', { name: 'Yes, fill in' }).click();

    /**
     * Verify the form is now filled with the English content but the relation should not be there because it doesn't exist in Spanish locale
     */
    await expect(page.getByRole('textbox', { name: 'title' }).first()).toHaveValue('UK Shop');
    // Check that the product relation is in the page
    await expect(
      page.getByRole('button', { name: 'Nike Mens 23/24 Away Stadium' })
    ).not.toBeVisible();

    /**
     * Second case: the relation is retrieved when it exists in the requested locale
     */

    /**
     * Create Spanish locale entry for a product
     */
    await page.getByRole('link', { name: 'Products' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    await page.getByRole('option', { name: 'English (en)' }).click();
    await clickAndWait(page, page.getByRole('gridcell', { name: 'Nike Mens 23/24 Away Stadium' }));
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByText('Spanish (es)').click();
    await page.getByRole('button', { name: 'Fill in from another locale' }).click();
    await page.getByRole('combobox', { name: 'Locale' }).click();
    await page.locator('span').filter({ hasText: 'English (en)' }).first().click();
    await page.getByRole('button', { name: 'Yes, fill in' }).click();
    /** Publish the document */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published document');
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    await page.getByRole('option', { name: 'English (en)' }).click();

    /**
     * Navigate to Shop single type
     */
    await navToHeader(page, ['Content Manager', 'Shop'], 'UK Shop');

    /**
     * Switch to Spanish locale to create a new locale entry (empty form)
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();

    /**
     * Open "More document actions" and click "Fill in from another locale"
     */
    await page.getByRole('button', { name: 'Fill in from another locale' }).click();
    await page.getByRole('combobox', { name: 'Locale' }).click();
    await page.locator('span').filter({ hasText: 'English (en)' }).first().click();
    await page.getByRole('button', { name: 'Yes, fill in' }).click();

    /**
     * Verify the form is now filled with the English content and now the relation should be there
     */
    await expect(page.getByRole('textbox', { name: 'title' }).first()).toHaveValue('UK Shop');
    // Check that the product relation is in the page
    await expect(page.getByRole('button', { name: 'Nike Mens 23/24 Away Stadium' })).toBeVisible();

    /**
     * Third case: fill from another locale should retrieve non localized relations
     */
    await page.getByRole('link', { name: 'Article' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    await page.getByRole('option', { name: 'English (en)' }).click();
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await page.getByRole('button', { name: 'Fill in from another locale' }).click();
    await page.getByRole('combobox', { name: 'Locale' }).click();
    await page.locator('span').filter({ hasText: 'English (en)' }).first().click();
    await page.getByRole('button', { name: 'Yes, fill in' }).click();

    /** We check that the relation is there after using the fill from another locale feature */
    await expect(page.getByRole('button', { name: 'Coach Beard' })).toBeVisible();
  });
});
