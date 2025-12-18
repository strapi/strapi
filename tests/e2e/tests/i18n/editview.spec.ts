import { test, expect } from '@playwright/test';

import { EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD } from '../../constants';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import {
  clickAndWait,
  describeOnCondition,
  findAndClose,
  navToHeader,
} from '../../../utils/shared';
import { waitForRestart } from '../../../utils/restart';

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

test.describe('Edit view', () => {
  test.describe.configure({ timeout: 500000 });

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
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
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

  test("As a user I should not be able to create a document in a locale I don't have permissions for", async ({
    page,
  }) => {
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;

    /**
     * Navigate to settings and roles & modify editor permissions
     */
    await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
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
    await findAndClose(page, 'Saved');

    /**
     * Logout and login as editor
     */
    await page.getByRole('button', { name: 'tt test testing' }).click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();

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
    await findAndClose(page, 'Saved');

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
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await page.waitForURL(LIST_URL);
    await page.getByRole('link', { name: 'Create new entry' }).click();
    await page.getByLabel('title').fill('trent crimm');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');

    /**
     * Create a Spanish (es) locale for the entry
     */
    await page.getByLabel('Locales').click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await page.getByLabel('title').fill('dani rojas');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');

    /**
     * Delete the Spanish (es) locale entry
     */
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete entry (Spanish (es))' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await findAndClose(page, 'Deleted');

    /**
     * Navigate to our homepage single-type and create a new entry
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Homepage' }).click();
    await page.waitForURL(HOMEPAGE_LIST_URL);
    await page.getByLabel('title').fill('football is life');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');

    /**
     * Create a Spanish (es) locale for the homepage entry
     */
    await page.getByLabel('Locales').click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await page.getByLabel('title').fill('el fútbol también es muerte.');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');

    /**
     * Delete the Spanish (es) locale homepage entry
     */
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete entry (Spanish (es))' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await findAndClose(page, 'Deleted');
  });

  test('As a user I want to publish multiple locales of my document', async ({ page, browser }) => {
    /**
     * Navigate to our articles list-view where there will be one document already made in the `en` locale
     */
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');

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
    await findAndClose(page, 'Saved');

    /**
     * Open the bulk locale publish modal
     */
    await page.getByText('More document actions').click();
    await page.getByRole('menuitem', { name: 'Publish multiple locales', exact: true }).click();

    // Select all locales, assert there are 2 drafts ready to publish and publish them
    await page
      .getByRole('row', { name: 'Select all entries Name' })
      .getByLabel('Select all entries')
      .click();

    await expect(page.getByText('2 entries ready to publish')).toBeVisible();
    await page
      .getByLabel('Publish multiple locales')
      .getByRole('button', { name: 'Publish' })
      .click();

    // Assert that all locales are now published
    await expect(page.getByRole('gridcell', { name: 'Already Published' })).toHaveCount(2);

    await expect(
      page.getByLabel('Publish multiple locales').getByRole('button', { name: 'Publish' })
    ).toBeDisabled();
  });

  test('As a user I want to unpublish multiple locales of my document', async ({
    page,
    browser,
  }) => {
    /**
     * Navigate to our articles list-view where there will be one document already made in the `en` locale
     */
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');

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
    await expect(
      page.getByRole('heading', { name: 'Why I prefer football over soccer' })
    ).toBeVisible();

    /**
     * Publish the english article
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published');

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
    await findAndClose(page, 'Saved');

    /**
     * Publish the spanish article
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published');

    /**
     * Open the bulk locale unpublish modal
     */
    await page.getByText('More document actions').click();
    await page.getByRole('menuitem', { name: 'Unpublish multiple locales', exact: true }).click();

    // Select all locales, assert there are 2 entries ready to unpublish and unpublish them
    await page
      .getByRole('row', { name: 'Select all entries Name' })
      .getByLabel('Select all entries')
      .click();

    /**
     * Unpublish the articles
     */
    await expect(page.getByRole('gridcell', { name: 'Ready to unpublish' })).toHaveCount(2);
    await page
      .getByLabel('Unpublish multiple locales')
      .getByRole('button', { name: 'Unpublish' })
      .click();

    // Assert that all locales are now unpublished
    await expect(page.getByRole('gridcell', { name: 'Draft' })).toHaveCount(2);

    await expect(
      page.getByLabel('Unpublish multiple locales').getByRole('button', { name: 'Unpublish' })
    ).toBeDisabled();
  });

  test('As a user I want to see non translatable fields pre-filled when creating a new locale of a document', async ({
    page,
  }) => {
    await navToHeader(page, ['Content-Type Builder', 'Products'], 'Products');
    await page.getByRole('button', { name: /add another field to this collection type/i }).click();
    await page
      .getByRole('button', { name: 'Text Small or long text like title or description' })
      .click();
    await page.getByLabel('Name', { exact: true }).fill('nonTranslatableField');
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByLabel('Enable localization for this').click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);

    // Create a new entry in the english locale
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await page.getByRole('link', { name: 'Create new entry' }).first().click();
    await page.getByLabel('name').fill('Translatable name (only for this locale)');
    await page.getByLabel('nonTranslatableField').fill('Non translatable value (for all locales)');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved Document');

    // Switch to french locale
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.getByRole('option', { name: 'French (fr)' }).click();

    // The non translatable field should be pre-filled with the value from the english locale
    await expect(page.getByLabel('nonTranslatableField')).toHaveValue(
      'Non translatable value (for all locales)'
    );
    // The translatable field should be empty though
    await expect(page.getByLabel('name')).toHaveValue('');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved Document');

    // Remove the field from the content type
    await navToHeader(page, ['Content-Type Builder', 'Products'], 'Products');
    await page.getByRole('button', { name: 'Delete nonTranslatableField' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);
  });
});

describeOnCondition(process.env.STRAPI_FEATURES_UNSTABLE_AI_LOCALIZATIONS === 'true')(() => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('As a user I want to enable AI translation', async ({ page }) => {
    // Navigate to an Article
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await page.getByRole('row', { name: 'Why I prefer football over soccer' }).click();

    // Assert the AI translation status is visible and disabled
    const aiTranslationStatus = page.getByLabel('AI Translation Status');
    await expect(aiTranslationStatus).toBeVisible();
    aiTranslationStatus.hover();
    await expect(page.getByRole('tooltip', { name: /AI translation disabled/ })).toBeVisible();

    // Go to i18n settings
    const enableLink = page.getByRole('link', { name: 'Enable it in settings' });
    await clickAndWait(page, enableLink);
    await page.waitForURL(/\/admin\/settings\/internationalization/);

    // Enable the setting
    const checkbox = await page.getByRole('checkbox');
    await expect(checkbox).not.toBeChecked();
    await checkbox.click();
    await findAndClose(page, 'Changes saved');
    await expect(checkbox).toBeChecked();

    // Navigate back to the Article
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await page.getByRole('row', { name: 'Why I prefer football over soccer' }).click();

    // Assert the AI translation status is visible and enabled
    await expect(aiTranslationStatus).toBeVisible();
    aiTranslationStatus.hover();
    await expect(page.getByRole('tooltip', { name: /AI translation enabled/ })).toBeVisible();
  });
});

describeOnCondition(process.env.STRAPI_FEATURES_UNSTABLE_AI_LOCALIZATIONS === 'true')(
  'Unstable edit view',
  () => {
    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin.tar');
      await page.goto('/admin');
      await login({ page });
    });

    test('As a user I want to enable AI translation', async ({ page }) => {
      // Navigate to an Article
      await navToHeader(page, ['Content Manager', 'Article'], 'Article');
      await page.getByRole('row', { name: 'Why I prefer football over soccer' }).click();

      // Assert the AI translation status is visible and disabled
      const aiTranslationStatus = page.getByLabel('AI Translation Status');
      await expect(aiTranslationStatus).toBeVisible();
      aiTranslationStatus.hover();
      await expect(page.getByRole('tooltip', { name: /AI translation disabled/ })).toBeVisible();

      // Go to i18n settings
      const enableLink = page.getByRole('link', { name: 'Enable it in settings' });
      await clickAndWait(page, enableLink);
      await page.waitForURL(/\/admin\/settings\/internationalization/);

      // Enable the setting
      const checkbox = await page.getByRole('checkbox');
      await expect(checkbox).not.toBeChecked();
      await checkbox.click();
      await findAndClose(page, 'Changes saved');
      await expect(checkbox).toBeChecked();

      // Navigate back to the Article
      await navToHeader(page, ['Content Manager', 'Article'], 'Article');
      await page.getByRole('row', { name: 'Why I prefer football over soccer' }).click();

      // Assert the AI translation status is visible and enabled
      await expect(aiTranslationStatus).toBeVisible();
      aiTranslationStatus.hover();
      await expect(page.getByRole('tooltip', { name: /AI translation enabled/ })).toBeVisible();
    });
  }
);
