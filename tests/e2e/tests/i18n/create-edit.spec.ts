import { test, expect } from '@playwright/test';

import { login } from '../../utils/login';
import { clickAndWait, findAndClose, navToHeader } from '../../utils/shared';
import { waitForRestart } from '../../utils/restart';
import { resetFiles } from '../../utils/file-reset';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';

test.describe('Create and Edit Operations', () => {
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('As a user I want to create a brand new document in the non-default locale', async ({
    page,
  }) => {
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::product.product(\?.*)?/;
    const EDIT_URL =
      /\/admin\/content-manager\/collection-types\/api::product.product\/[^/]+(\?.*)?/;
    const CREATE_URL =
      /\/admin\/content-manager\/collection-types\/api::product.product\/create(\?.*)?/;

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

    /**
     * Swap to es locale to create a new document
     */
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'Spanish (es)'
    );
    await expect(page.getByText('No content found')).toBeVisible();

    /**
     * So now we're going to create a document.
     */
    await page.getByRole('link', { name: 'Create new entry' }).first().click();
    await page.waitForURL(CREATE_URL);
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Locales' })).toHaveText('Spanish (es)');
    expect(new URL(page.url()).searchParams.get('plugins[i18n][locale]')).toEqual('es');
    await page
      .getByRole('textbox', { name: 'name' })
      .fill('Camiseta de fuera 23/24 de Nike para hombres');

    /**
     * Verify the UID works as expected
     */
    await expect
      .poll(async () => {
        const requestPromise = page.waitForRequest('**/content-manager/uid/generate?locale=es');
        await page.getByRole('button', { name: 'Regenerate' }).click();
        const req = await requestPromise;
        return req.postDataJSON();
      })
      .toMatchObject({
        contentTypeUID: 'api::product.product',
        data: {
          id: '',
          isAvailable: true,
          name: 'Camiseta de fuera 23/24 de Nike para hombres',
          slug: 'product',
        },
        field: 'slug',
      });
    await expect(page.getByRole('textbox', { name: 'slug' })).toHaveValue(
      'camiseta-de-fuera-23-24-de-nike-para-hombres'
    );

    /**
     * Publish the document
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published');

    /**
     * Now we'll go back to the list view to ensure the content has been updated
     */
    await page.getByRole('link', { name: 'Products' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'Spanish (es)'
    );
    await expect(
      page.getByRole('row', { name: 'Camiseta de fuera 23/24 de Nike para hombres' })
    ).toBeVisible();

    /**
     * Now we'll go back to the edit view to swap back to the en locale to ensure
     * these updates were made on a different document
     */
    await page.getByRole('row', { name: 'Camiseta de fuera 23/24 de Nike para hombres' }).click();
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Camiseta de fuera 23/24 de Nike para hombres' })
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'English (en)' }).click();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();
  });

  test('As a user I want to add a locale entry to an existing document', async ({
    browser,
    page,
  }) => {
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::product.product(\?.*)?/;
    const EDIT_URL =
      /\/admin\/content-manager\/collection-types\/api::product.product\/[^/]+(\?.*)?/;

    /**
     * Navigate to our products list-view where there will be one document already made in the `en` locale
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
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();

    /**
     * Now we should be on a new document in the `es` locale
     */
    expect(new URL(page.url()).searchParams.get('plugins[i18n][locale]')).toEqual('es');
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();

    /**
     * This is here because the `fill` method below doesn't immediately update the value
     * in webkit.
     */
    if (browser.browserType().name() === 'webkit') {
      await page.getByRole('textbox', { name: 'name' }).press('s');
      await page.getByRole('textbox', { name: 'name' }).press('Delete');
    }

    await page
      .getByRole('textbox', { name: 'name' })
      .fill('Camiseta de fuera 23/24 de Nike para hombres');

    /**
     * Verify the UID works as expected due to issues with webkit above,
     * this has been kept.
     */
    await expect
      .poll(
        async () => {
          const requestPromise = page.waitForRequest('**/content-manager/uid/generate?locale=es');
          await page.getByRole('button', { name: 'Regenerate' }).click();
          const body = (await requestPromise).postDataJSON();
          return body;
        },
        {
          intervals: [1000, 2000, 4000, 8000],
        }
      )
      .toMatchObject({
        contentTypeUID: 'api::product.product',
        data: {
          id: expect.any(String),
          name: 'Camiseta de fuera 23/24 de Nike para hombres',
          slug: 'product',
        },
        field: 'slug',
      });

    await expect(page.getByRole('textbox', { name: 'slug' })).toHaveValue(
      'camiseta-de-fuera-23-24-de-nike-para-hombres'
    );

    /**
     * Publish the document
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published');

    /**
     * Now we'll go back to the list view to ensure the content has been updated
     */
    await page.getByRole('link', { name: 'Products' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'Spanish (es)'
    );
    await expect(
      page.getByRole('row', { name: 'Camiseta de fuera 23/24 de Nike para hombres' })
    ).toBeVisible();

    /**
     * Now we'll go back to the edit view to swap back to the en locale to ensure
     * these updates were made on the same document
     */
    await page.getByRole('row', { name: 'Camiseta de fuera 23/24 de Nike para hombres' }).click();
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Camiseta de fuera 23/24 de Nike para hombres' })
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'English (en)' }).click();
    await expect(
      page.getByRole('heading', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();
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
