import { test, expect } from '@playwright/test';

import { login } from '../../../utils/login';
import { navToHeader } from '../../../utils/shared';
import { findAndClose } from '../../../utils/shared';
import { resetFiles } from '../../../utils/file-reset';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';

test.describe('Locale Isolation', () => {
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('As a user I want to verify that modifying a localized field only affects the current locale', async ({
    page,
  }) => {
    const EDIT_URL =
      /\/admin\/content-manager\/collection-types\/api::product.product\/[^/]+(\?.*)?/;

    /**
     * Navigate to our products list-view
     */
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

    /**
     * Assert we're on the english locale and our document exists
     */
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'English (en)'
    );
    await expect(
      page.getByRole('row', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();
    await page.getByRole('row', { name: 'Nike Mens 23/24 Away Stadium Jersey' }).click();

    /**
     * Assert we're on the edit view for the document
     */
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();

    /**
     * First, create a Spanish locale entry for this document
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();
    await page.getByRole('textbox', { name: 'name' }).fill('Camiseta Nike Masculina 23/24');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');

    /**
     * Switch back to English locale
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'English (en)' }).click();
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();

    /**
     * Modify a localized field (name) in the English locale
     */
    const modifiedName = 'Nike Mens 23/24 Away Stadium Jersey - Modified';
    await page.getByRole('textbox', { name: 'name' }).first().fill(modifiedName);

    /**
     * Save the changes
     */
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');

    /**
     * Switch to Spanish locale to verify the change only affected English
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Camiseta Nike Masculina 23/24' })
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'name' }).first()).toHaveValue(
      'Camiseta Nike Masculina 23/24'
    );

    /**
     * Switch back to English to verify our change persisted
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'English (en)' }).click();
    await page.waitForURL(EDIT_URL);

    /**
     * Verify the heading shows the modified name and the textbox has the correct value
     */
    await expect(page.getByRole('heading', { name: modifiedName })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'name' }).first()).toHaveValue(modifiedName);
  });

  test('As a user I want to verify that publishing only affects the current locale', async ({
    page,
  }) => {
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::product.product(\?.*)?/;
    const EDIT_URL =
      /\/admin\/content-manager\/collection-types\/api::product.product\/[^/]+(\?.*)?/;

    /**
     * Navigate to our products list-view
     */
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

    /**
     * Assert we're on the english locale and our document exists
     */
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'English (en)'
    );
    await expect(
      page.getByRole('row', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();
    await page.getByRole('row', { name: 'Nike Mens 23/24 Away Stadium Jersey' }).click();

    /**
     * Assert we're on the edit view for the document
     */
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();

    /**
     * First, create a Spanish locale entry for this document
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();
    await page.getByRole('textbox', { name: 'name' }).fill('Camiseta Nike Masculina 23/24');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');

    /**
     * Switch back to English locale
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'English (en)' }).click();
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();

    /**
     * Publish the English locale
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published');

    /**
     * Navigate back to the list view to check document statuses
     */
    await page.getByRole('link', { name: 'Products' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

    /**
     * Check that English locale shows as published
     */
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'English (en)'
    );
    await expect(
      page
        .getByRole('row', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
        .getByRole('status', { name: 'published' })
    ).toBeVisible();

    /**
     * Switch to Spanish locale to verify it remains in draft state
     */
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'Spanish (es)'
    );
    await expect(
      page
        .getByRole('row', { name: 'Camiseta Nike Masculina 23/24' })
        .getByRole('status', { name: 'draft' })
    ).toBeVisible();
  });

  test('As a user I want to verify that modifying a non-localized field affects all locales', async ({
    page,
  }) => {
    const EDIT_URL =
      /\/admin\/content-manager\/collection-types\/api::product.product\/[^/]+(\?.*)?/;

    /**
     * Navigate to our products list-view
     */
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

    /**
     * Assert we're on the english locale and our document exists
     */
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'English (en)'
    );
    await expect(
      page.getByRole('row', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();
    await page.getByRole('row', { name: 'Nike Mens 23/24 Away Stadium Jersey' }).click();

    /**
     * Assert we're on the edit view for the document
     */
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();

    /**
     * Create a Spanish locale entry for this document
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();
    await page.getByRole('textbox', { name: 'name' }).fill('Camiseta Nike Masculina 23/24');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');

    /**
     * Switch back to English locale
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'English (en)' }).click();
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();

    /**
     * Modify a non-localized field (isAvailable) in the English locale
     */
    await page.getByRole('checkbox', { name: 'isAvailable' }).uncheck();
    await expect(page.getByRole('checkbox', { name: 'isAvailable' })).not.toBeChecked();

    /**
     * Save the changes
     */
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');

    /**
     * Switch to Spanish locale to verify the non-localized field change affected all locales
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Camiseta Nike Masculina 23/24' })
    ).toBeVisible();

    /**
     * Verify that the non-localized field (isAvailable) is also unchecked in Spanish locale
     */
    await expect(page.getByRole('checkbox', { name: 'isAvailable' })).not.toBeChecked();

    /**
     * Switch back to English to verify the change persisted there too
     */
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'English (en)' }).click();
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'isAvailable' })).not.toBeChecked();
  });
});
