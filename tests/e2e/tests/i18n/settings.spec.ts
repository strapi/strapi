import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { prunePermissions } from '../../scripts/endpoints';
import { clickAndWait, findAndClose, navToHeader } from '../../utils/shared';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
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
    await clickAndWait(page, page.getByRole('link', { name: 'Settings' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Internationalization' }));

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
    await findAndClose(page, 'Success:Locale successfully added');

    /**
     * Next, we'll navigate to our shop single type & add the a localised version of this document.
     */
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
    await expect(page.getByRole('heading', { name: 'UK Shop' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Locales' }).click();
    expect(await page.getByRole('option').all()).toHaveLength(5);
    for (const locale of [...LOCALES, 'Italian (it)']) {
      await expect(page.getByRole('option', { name: locale })).toBeVisible();
    }
    await page.getByRole('option', { name: 'Italian (it)' }).click();
    await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();

    /**
     * Because this is technically a new entry, we should assert that the document panel actions are disabled.
     */
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

    if (edition === 'EE') {
      // Assert the menu state for enterprise edition
      await expect(page.getByRole('button', { name: 'More document actions' })).toBeEnabled();
      await page.getByRole('button', { name: 'More document actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Add to release' })).toBeEnabled();
      await expect(page.getByRole('menuitem', { name: 'Unpublish' })).toBeDisabled();
      await expect(page.getByRole('menuitem', { name: 'Discard changes' })).toBeDisabled();
      await page.keyboard.press('Escape');
    } else {
      // Otherwise, for community edition, the menu should be disabled
      await expect(page.getByRole('button', { name: 'More document actions' })).toBeDisabled();
    }

    /**
     * Assert the document header actions action are enabled
     */
    await page.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Edit the model' })).toBeEnabled();
    await expect(page.getByRole('menuitem', { name: 'Configure the view' })).toBeEnabled();
    await expect(
      page.getByRole('menuitem', { name: 'Delete entry (Italian (it))' })
    ).toBeDisabled();
    await expect(page.getByRole('menuitem', { name: 'Delete entry', exact: true })).toBeEnabled();
    await page.keyboard.press('Escape');

    /**
     * Now we create it.
     */
    await page.getByRole('textbox', { name: 'title' }).fill('Negozio sportivo');
    await page.getByRole('button', { name: 'No entry yet. Click to add one.' }).click();
    await page.getByRole('textbox', { name: 'title' }).nth(1).fill('Negozio sportivo');
    await page.getByRole('checkbox', { name: 'indexable' }).click();

    /**
     * Try to publish. It should fail because content has a min: 2 constraint
     * Then it should display the "missing component" validation error (as a button)
     */
    await page.getByRole('button', { name: 'Publish' }).click();

    /**
     * Create the missing components in the "content" dynamic zone.
     */
    await page.getByRole('button', { name: 'There are 2 missing components' }).click();
    // Click the button in the DZ component picker
    await page.getByRole('button', { name: 'Product carousel' }).click();
    // Click the DZ component toggle button
    await page.getByRole('button', { name: 'Product carousel' }).click();

    await page
      .getByRole('region', { name: /Product carousel/ })
      .getByRole('textbox', { name: 'title' })
      .fill('Magliette');
    await page.getByRole('button', { name: 'There is 1 missing component' }).click();
    await page.getByRole('button', { name: 'Hero image' }).click();
    await expect(page.getByText('content (2)')).toBeVisible();

    /**
     * Successfully publish the entry once the data is valid.
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Success:Published');
  });

  test('As a user I want to delete an existing locale and have the content deleted as well', async ({
    page,
  }) => {
    /**
     * Go to the list view first to assert the current state of the data.
     * We'll assert that the default locale is "English (en)" and that we have 2 entries.
     * and that all the expected locales exist in the select dropdown.
     */
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
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

    await page.getByRole('button', { name: 'Confirm' }).click();
    await findAndClose(page, 'Success:Locale successfully deleted');

    /**
     * Finally, go back to the list view, the english articles should be there,
     * but we should not see the french locale option anymore.
     */
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
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
    /**
     * Go to the list view first to assert the current state of the data.
     */
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Products' }));
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText(
      'English (en)'
    );
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
    await page.getByRole('textbox', { name: 'Locale display name' }).fill('UK English');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Locale successfully edited');

    /**
     * Lets go back to the list view and assert that the changes are reflected.
     */
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    expect(await page.getByRole('row').all()).toHaveLength(2);
    await expect(page.getByRole('combobox', { name: 'Select a locale' })).toHaveText('UK English');
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    for (const locale of ['UK English', ...LOCALES].filter((locale) => locale !== 'English (en)')) {
      await expect(page.getByRole('option', { name: locale })).toBeVisible();
    }
  });
});
