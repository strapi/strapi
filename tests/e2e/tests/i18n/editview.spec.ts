import { test, expect } from '@playwright/test';

import { EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD } from '../../constants';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { findAndClose } from '../../utils/shared';
import { waitForRestart } from '../../utils/restart';

test.describe('Edit view', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
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
    await findAndClose(page, 'Success:Published');

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
    await findAndClose(page, 'Success:Published');

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

  test("As a user I should not be able to create a document in a locale I don't have permissions for", async ({
    page,
  }) => {
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;

    /**
     * Navigate to settings and roles & modify editor permissions
     */
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await page.getByRole('link', { name: 'Roles' }).first().click();
    await page.getByRole('gridcell', { name: 'Editor', exact: true }).click();

    /**
     * Set permissions for English (en) locale
     */
    await page.getByRole('button', { name: 'Article' }).click();
    await page.getByLabel('Select all English (en)').check();

    /**
     * Set permissions for French (fr) locale. Editors can now do everything BUT
     * create french content
     */
    await page.getByLabel('Select all French (fr)').check();
    await page.getByLabel('Select fr Create permission').uncheck();

    // Scroll to the top of the page before clicking save
    // TODO: Fix the need to scroll to the top before saving. z-index of layout
    // header is behind the permissions component.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Saved');

    /**
     * Logout and login as editor
     */
    await page.getByRole('button', { name: 'tt test testing' }).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });

    /**
     * Verify permissions
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByText('English (en)', { exact: true })).toBeVisible();

    /**
     * Verify we can create a new entry in the english locale as expected
     */
    await page.getByRole('link', { name: 'Create new entry' }).click();
    await page.getByLabel('title').fill('the richmond way');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Saved');

    /**
     * Verify we cannot create a new entry in the french locale as editors do
     * not have the right permissions
     */
    await page.getByLabel('Locales').click();
    await expect(page.getByLabel('Create French (fr) locale')).toBeDisabled();
  });

  test('As a user I should be able to delete a locale of a single type and collection type', async ({
    page,
  }) => {
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;
    const HOMEPAGE_LIST_URL =
      /\/admin\/content-manager\/single-types\/api::homepage.homepage(\?.*)?/;

    /**
     * Navigate to our articles list-view and create a new entry
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.waitForURL(LIST_URL);
    await page.getByRole('link', { name: 'Create new entry' }).click();
    await page.getByLabel('title').fill('trent crimm');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Saved');

    /**
     * Create a Spanish (es) locale for the entry
     */
    await page.getByLabel('Locales').click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await page.getByLabel('title').fill('dani rojas');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Saved');

    /**
     * Delete the Spanish (es) locale entry
     */
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete entry (Spanish (es))' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await findAndClose(page, 'Success:Deleted');

    /**
     * Navigate to our homepage single-type and create a new entry
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Homepage' }).click();
    await page.waitForURL(HOMEPAGE_LIST_URL);
    await page.getByLabel('title').fill('football is life');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Saved');

    /**
     * Create a Spanish (es) locale for the homepage entry
     */
    await page.getByLabel('Locales').click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await page.getByLabel('title').fill('el fútbol también es muerte.');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Saved');

    /**
     * Delete the Spanish (es) locale homepage entry
     */
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete entry (Spanish (es))' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await findAndClose(page, 'Success:Deleted');
  });

  test('As a user I want to publish multiple locales of my document', async ({ page, browser }) => {
    if (browser.browserType().name() === 'webkit') {
      // See DX-1550
      return test.fixme();
    }

    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;
    const EDIT_URL =
      /\/admin\/content-manager\/collection-types\/api::article.article\/[^/]+(\?.*)?/;

    /**
     * Navigate to our articles list-view where there will be one document already made in the `en` locale
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Article' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();

    /**
     * Assert we're on the english locale and our document exists
     */
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'English (en)'
    );
    await expect(
      page.getByRole('row', { name: 'Why I prefer football over soccer' })
    ).toBeVisible();
    await page.getByRole('row', { name: 'Why I prefer football over soccer' }).click();

    /**
     * Create a new spanish draft article
     */
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Why I prefer football over soccer' })
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
      await page.getByRole('textbox', { name: 'title' }).press('s');
      await page.getByRole('textbox', { name: 'title' }).press('Delete');
    }

    await page.getByRole('textbox', { name: 'title' }).fill('Por qué prefiero el fútbol al fútbol');

    /**
     * Save the spanish draft
     */
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Saved');

    /**
     * Open the bulk locale publish modal
     */
    await page.getByText('More document actions').click();
    await page.getByRole('menuitem', { name: 'Publish Multiple Locales', exact: true }).click();

    // Select all locales, assert there are 2 drafts ready to publish and publish them
    await page
      .getByRole('row', { name: 'Select all entries Name' })
      .getByLabel('Select all entries')
      .click();

    await expect(page.getByText('2 entries ready to publish')).toBeVisible();
    await page
      .getByLabel('Publish Multiple Locales')
      .getByRole('button', { name: 'Publish' })
      .click();

    // Assert that all locales are now published
    await expect(page.getByRole('gridcell', { name: 'Already Published' })).toHaveCount(2);

    await expect(
      page.getByLabel('Publish Multiple Locales').getByRole('button', { name: 'Publish' })
    ).toBeDisabled();
  });

  test('As a user I want to unpublish multiple locales of my document', async ({
    page,
    browser,
  }) => {
    if (browser.browserType().name() === 'webkit') {
      // See DX-1550
      return test.fixme();
    }

    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;
    const EDIT_URL =
      /\/admin\/content-manager\/collection-types\/api::article.article\/[^/]+(\?.*)?/;

    /**
     * Navigate to our articles list-view where there will be one document already made in the `en` locale
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Article' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();

    /**
     * Assert we're on the english locale and our document exists
     */
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'English (en)'
    );
    await expect(
      page.getByRole('row', { name: 'Why I prefer football over soccer' })
    ).toBeVisible();
    await page.getByRole('row', { name: 'Why I prefer football over soccer' }).click();

    /**
     * Create a new spanish draft article
     */
    await page.waitForURL(EDIT_URL);
    await expect(
      page.getByRole('heading', { name: 'Why I prefer football over soccer' })
    ).toBeVisible();

    /**
     * Publish the english article
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Success:Published');

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
      await page.getByRole('textbox', { name: 'title' }).press('s');
      await page.getByRole('textbox', { name: 'title' }).press('Delete');
    }

    await page.getByRole('textbox', { name: 'title' }).fill('Por qué prefiero el fútbol al fútbol');

    /**
     * Save the spanish draft
     */
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Saved');

    /**
     * Publish the spanish article
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Success:Published');

    /**
     * Open the bulk locale unpublish modal
     */
    await page.getByText('More document actions').click();
    await page.getByRole('menuitem', { name: 'Unpublish Multiple Locales', exact: true }).click();

    // Select all locales, assert there are 2 entries ready to unpublish and unpublish them
    await page
      .getByRole('row', { name: 'Select all entries Name' })
      .getByLabel('Select all entries')
      .click();

    /**
     * Unpublish the articles
     */
    await expect(page.getByText('2 entries ready to unpublish')).toBeVisible();
    await page
      .getByLabel('Unpublish Multiple Locales')
      .getByRole('button', { name: 'Unpublish' })
      .click();

    // Assert that all locales are now unpublished
    await expect(page.getByRole('gridcell', { name: 'Draft' })).toHaveCount(2);

    await expect(
      page.getByLabel('Unpublish Multiple Locales').getByRole('button', { name: 'Unpublish' })
    ).toBeDisabled();
  });

  interface ValidationType {
    field: string;
    initialValue: string;
    expectedError: string;
    ctbParams: {
      key: string;
      operation: {
        type: 'click' | 'fill';
        value?: string;
      };
    };
  }

  const typesOfValidation: Record<string, ValidationType> = {
    required: {
      field: 'title',
      initialValue: '',
      ctbParams: {
        key: 'Required Field',
        operation: {
          type: 'click',
        },
      },
      expectedError: 'This value is required.',
    },
    maxLength: {
      field: 'title',
      initialValue: 'a'.repeat(256),
      ctbParams: {
        key: 'Maximum Length',
        operation: {
          type: 'fill',
          value: '255',
        },
      },
      expectedError: 'The value is too long',
    },
    // TODO schema changes from previous runs persist which means each new
    // validation must take into account the previous one.
    minLength: {
      field: 'title',
      initialValue: 'a'.repeat(10),
      ctbParams: {
        key: 'Minimum Length',
        operation: {
          type: 'fill',
          value: '11',
        },
      },
      expectedError: 'The value is too short',
    },
  };

  for (const [type, validationParams] of Object.entries(typesOfValidation)) {
    test.fixme(
      `As a user I want to see the relevant error message when trying to publish a draft that fails ${type} validation`,
      async ({ browser, page }) => {
        const LIST_URL = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;
        const EDIT_URL =
          /\/admin\/content-manager\/collection-types\/api::article.article\/[^/]+(\?.*)?/;

        const {
          field,
          initialValue,
          ctbParams: { key: ctbKey, operation: ctbOperation },
          expectedError,
        } = validationParams;

        /**
         * Navigate to our articles list-view where there will be one document already made in the `en` locale
         */
        await page.getByRole('link', { name: 'Content Manager' }).click();
        await page.getByRole('link', { name: 'Article' }).click();
        await page.waitForURL(LIST_URL);
        await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();

        /**
         * Assert we're on the english locale and our document exists
         */
        await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
          'English (en)'
        );
        await expect(
          page.getByRole('row', { name: 'Why I prefer football over soccer' })
        ).toBeVisible();
        await page.getByText('why-i-prefer-football-over-').click();
        await page.waitForURL(EDIT_URL);

        /**
         * This is here because the `fill` method below doesn't immediately update the value
         * in webkit.
         */
        if (browser.browserType().name() === 'webkit') {
          await page.getByRole('textbox', { name: 'title' }).press('s');
          await page.getByRole('textbox', { name: 'title' }).press('Delete');
        }

        /**
         * Fill the target field with the initial value, there is currently no
         * validation on this field
         */
        await page.getByRole('textbox', { name: field }).fill(initialValue);
        await page.getByRole('button', { name: 'Save' }).click();
        await findAndClose(page, 'Success:Saved');

        /**
         * Navigate to the CTB and modify the schema of the article to apply the
         * validation constraints to the field
         */
        await page.getByRole('link', { name: 'Content-Type Builder' }).click();
        await page.getByRole('button', { name: 'Close' }).click(); // TODO improve this

        /**
         * Edit the field and apply the validation constraint
         */
        await page.getByRole('link', { name: 'Article' }).click();
        await page
          .getByRole('button', { name: `Edit ${field}` })
          .first()
          .click();
        await page.getByRole('tab', { name: 'Advanced settings' }).click();

        const ctbOperatonType = ctbOperation?.type ?? '';
        switch (ctbOperatonType) {
          case 'click':
            await page.getByLabel(ctbKey).first().click();
            break;
          case 'fill': {
            if (!ctbOperation?.value) {
              throw new Error('CTB operation value is required');
            }

            await page.getByLabel(ctbKey).first().click();
            await page.getByRole('textbox', { name: ctbKey }).fill(ctbOperation.value);
            break;
          }
          default:
            throw new Error(`Unsupported CTB operation type ${ctbOperatonType} provided`);
        }

        await page.getByRole('button', { name: 'Finish' }).click();
        await page.getByRole('button', { name: 'Save' }).click();

        /**
         * Wait for the server to restart
         */
        await waitForRestart(page);

        /**
         * Navigate back to the article we just modified
         */
        await page.getByRole('link', { name: 'Content Manager' }).click();
        await page.getByRole('link', { name: 'Article' }).click();
        await page.waitForURL(LIST_URL);

        await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
          'English (en)'
        );

        /**
         * Attempt to publish through the 'Publish Multiple Locales' button
         */
        await page.getByText('why-i-prefer-football-over-').click();
        await page.getByRole('button', { name: 'More document actions' }).click();
        await page.getByText('Publish Multiple Locales').click();

        /**
         * We have modified the content and then modifed the schema in a way that
         * is incompatible. Therefore we should expect the relevant error message
         * to be displayed.
         */
        await expect(page.getByText('1 entry waiting for action')).toBeVisible();
        await expect(
          page.getByLabel('Publish Multiple Locales').getByText(`${field}: ${expectedError}`)
        ).toBeVisible();
      }
    );
  }
});
