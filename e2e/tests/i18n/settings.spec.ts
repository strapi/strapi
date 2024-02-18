import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';
import { login } from '../../utils/login';
import { prunePermissions } from '../../scripts/endpoints';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
    await prunePermissions(page);
    await page.goto('/admin');
    await login({ page });
  });

  const LOCALES = ['English (en)', 'French (fr)', 'German (de)', 'Spanish (es)'];

  test('As a user I want to create a locale and then create an entry in that locale', async ({
    page,
  }) => {
    /**
     * Get to the settings page
     */
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Internationalization' }).click();

    /**
     * Assert that the page has the expected elements & data, the locales installed in the test-app.
     */
    await expect(page.getByRole('heading', { name: 'Internationalization' })).toBeVisible();
    expect(await page.getByRole('row').all()).toHaveLength(5);
    for (const locale of LOCALES) {
      expect(page.getByRole('gridcell', { name: locale, exact: true })).toBeVisible();
    }

    /**
     * Add a new locale to the current list.
     */
    await page.getByRole('button', { name: 'Add new locale' }).click();
    await expect(page.getByRole('dialog', { name: 'Add new locale' })).toBeVisible();
    expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Locales' }).click();
    await page.press('body', 'I');
    await page.getByRole('option', { name: 'Italian (it)' }).click();
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Success:Locale successfully added')).toBeVisible();

    /**
     * Next, we'll navigate to our shop single type & add the a localised version of this document.
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Shop' }).click();
    await page.waitForURL(/\/admin\/content-manager\/single-types\/api::shop.shop(\?.*)?/);
    await expect(page.getByRole('heading', { name: 'UK Shop' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Locales' }).click();
    expect(await page.getByRole('option').all()).toHaveLength(5);
    for (const locale of [...LOCALES, 'Italian (it)']) {
      await expect(page.getByRole('option', { name: locale })).toBeVisible();
    }
    await page.getByRole('option', { name: 'Italian (it)' }).click();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();

    /**
     * Because this is technically a new entry, we should assert that the document actions are disabled.
     */
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'More document actions' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'More actions' })).toBeEnabled();
    await page.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Edit the model' })).toBeEnabled();
    await expect(page.getByRole('menuitem', { name: 'Configure the view' })).toBeEnabled();
    await expect(page.getByRole('menuitem', { name: 'Delete locale' })).toBeDisabled();
    await expect(page.getByRole('menuitem', { name: 'Delete document' })).toBeEnabled();
    await page.keyboard.press('Escape');

    /**
     * Now we create it.
     */
    await page.getByRole('textbox', { name: 'title' }).fill('Negozio sportivo');
    await page.getByRole('button', { name: 'No entry yet. Click on the' }).click();
    await page.getByRole('textbox', { name: 'title' }).nth(1).fill('Negozio sportivo');
    await page.getByRole('checkbox', { name: 'indexable' }).click();
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Success:Published')).toBeVisible();
  });

  test('As a user I want to delete an existing locale and have the content deleted as well', async ({
    page,
  }) => {
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;

    /**
     * Go to the list view first to assert the current state of the data.
     * We'll assert that the default locale is "English (en)" and that we have 2 entries.
     * and that all the expected locales exist in the select dropdown.
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Article' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
    expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText('English (en)');
    expect(await page.getByRole('row').all()).toHaveLength(3);
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    for (const locale of LOCALES) {
      await expect(page.getByRole('option', { name: locale })).toBeVisible();
    }
    await page.keyboard.press('Escape');

    /**
     * Next, we'll delete the french locale
     */
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Internationalization' }).click();
    await expect(page.getByRole('heading', { name: 'Internationalization' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete French (fr) locale' }).click();

    await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Success:Locale successfully deleted')).toBeVisible();

    /**
     * Finally, go back to the list view, the english articles should be there,
     * but we should not see the french locale option anymore.
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Article' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
    expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText('English (en)');
    expect(await page.getByRole('row').all()).toHaveLength(3);
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    for (const locale of LOCALES) {
      if (locale !== 'French (fr)') {
        await expect(page.getByRole('option', { name: locale })).toBeVisible();
      } else {
        await expect(page.getByRole('option', { name: locale })).not.toBeVisible();
      }
    }
  });

  test('As a user I want to update a locale and have the changes reflected across my application', async ({
    page,
  }) => {
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::product.product(\?.*)?/;

    /**
     * Go to the list view first to assert the current state of the data.
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Products' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    expect(await page.getByRole('row').all()).toHaveLength(2);
    expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText('English (en)');
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    for (const locale of LOCALES) {
      await expect(page.getByRole('option', { name: locale })).toBeVisible();
    }
    await page.keyboard.press('Escape');

    /**
     * Next, change the display name of our default locale – "English (en)" to "UK English"
     */
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Internationalization' }).click();
    await expect(page.getByRole('heading', { name: 'Internationalization' })).toBeVisible();
    await page.getByRole('gridcell', { name: 'English (en)', exact: true }).click();
    await page.getByRole('textbox', { name: 'Locale display name' }).fill('');
    await page.getByRole('textbox', { name: 'Locale display name' }).fill('UK English');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Success:Locale successfully edited')).toBeVisible();

    /**
     * Lets go back to the list view and assert that the changes are reflected.
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Products' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    expect(await page.getByRole('row').all()).toHaveLength(2);
    expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText('UK English');
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    for (const locale of ['UK English', ...LOCALES].filter((locale) => locale !== 'English (en)')) {
      await expect(page.getByRole('option', { name: locale })).toBeVisible();
    }
  });
});
