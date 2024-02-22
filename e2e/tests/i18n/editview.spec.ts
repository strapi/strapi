import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';
import { login } from '../../utils/login';

test.describe('Edit view', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
    await page.goto('/admin');
    await login({ page });
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
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Products' }).click();
    await page.waitForURL(LIST_URL);
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
    await expect(page.getByRole('row', { name: 'No content found' })).toBeVisible();

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
        const requestePromise = page.waitForRequest('**/content-manager/uid/generate?locale=es');
        await page.getByRole('button', { name: 'Regenerate' }).click();
        const req = await requestePromise;
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
    await expect(page.getByText('Success:Published')).toBeVisible();

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

  test('As a user I want to add a locale entry to an existing document', async ({ page }) => {
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::product.product(\?.*)?/;
    const EDIT_URL =
      /\/admin\/content-manager\/collection-types\/api::product.product\/[^/]+(\?.*)?/;

    /**
     * Navigate to our products list-view where there will be one document already made in the `en` locale
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Products' }).click();
    await page.waitForURL(LIST_URL);
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
    await page
      .getByRole('textbox', { name: 'name' })
      .fill('Camiseta de fuera 23/24 de Nike para hombres');

    /**
     * Verify the UID works as expected
     */
    await expect
      .poll(
        async () => {
          const requestePromise = page.waitForRequest('**/content-manager/uid/generate?locale=es');
          await page.getByRole('button', { name: 'Regenerate' }).click();
          const req = await requestePromise;
          return req.postDataJSON();
        },
        {
          timeout: 30 * 1000,
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
    await expect(page.getByText('Success:Published')).toBeVisible();

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
});
