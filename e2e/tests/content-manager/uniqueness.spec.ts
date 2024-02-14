import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';

test.describe('Uniqueness', () => {
  test.beforeEach(async ({ page }) => {
    // Reset the DB and also specify that we are wiping all entries of the unique content type each time
    await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');

    await page.goto('/admin');
    await login({ page });

    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Unique' }).click();
  });

  const FIELDS_TO_TEST = [
    { name: 'uniqueString', value: 'unique' },
    { name: 'uniqueNumber', value: '10' },
    { name: 'uniqueEmail', value: 'test@testing.com' },
    { name: 'uniqueDate', value: '01/01/2024', newValue: '02/01/2024', role: 'combobox' },
    { name: 'UID', value: 'unique' },
  ] as const;

  const clickSave = async (page) => {
    await page.getByRole('button', { name: 'Save' }).isEnabled();
    await page.getByRole('tab', { name: 'Draft' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
  };

  const CREATE_URL =
    /\/admin\/content-manager\/collection-types\/api::unique.unique\/create(\?.*)?/;
  const LIST_URL = /\/admin\/content-manager\/collection-types\/api::unique.unique(\?.*)?/;

  /**
   * @note the unique content type is set up with every type of document level unique field.
   * We are testing that uniqueness is enforced for these fields across all entries of a content type in the same locale.
   */
  FIELDS_TO_TEST.forEach((field) => {
    test(`A user should not be able to duplicate the ${field.name} document field value in the same content type and locale. Validation should not happen across locales`, async ({
      page,
    }) => {
      await page.getByRole('link', { name: 'Create new entry' }).first().click();

      await page.waitForURL(CREATE_URL);

      /**
       * Now we're in the edit view. The content within each entry will be valid from the previous test run.
       */
      const fieldRole = 'role' in field ? field.role : 'textbox';
      await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

      await clickSave(page);
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.getByRole('link', { name: 'Unique' }).click();
      await page.waitForURL(LIST_URL);

      /**
       * Try to create another entry with the same value, the validation should fail
       */
      await page.getByRole('link', { name: 'Create new entry' }).first().click();

      await page.waitForURL(CREATE_URL);

      await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

      await clickSave(page);

      await expect(page.locator('text=This attribute must be unique').first()).toBeVisible();

      /**
       * Modify the value and try again, this should save successfully
       * Either take the new value provided in the field object or generate a random new one
       */
      // TODO: find a better way to generate random values for all field types
      const newValue =
        'newValue' in field
          ? field.newValue
          : isNaN(Number(field.value))
          ? String.fromCharCode(Math.floor(Math.random() * 26) + 97) + field.value.substring(1)
          : `${Number(field.value) + 10}`;

      await page
        .getByRole(fieldRole, {
          name: field.name,
        })
        .fill(newValue);

      await clickSave(page);
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.getByRole('link', { name: 'Unique' }).click();
      await page.waitForURL(LIST_URL);

      /**
       * TODO: this is skipped because it requires the ability to change locales in the UI.
       */
      /**
       * Change locale and try to create an entry with the same value as our first entry, this should save successfully
       */
      // await page.getByRole('combobox', { name: 'Select a locale' }).click();

      // await page.getByText('French (fr)').click();

      // await page.getByRole('link', { name: 'Create new entry' }).first().click();

      // await page.waitForURL(EDIT_URL);

      // await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

      // await clickSave(page);
      // await expect(page.getByText('Saved').first()).toBeVisible();

      // await page.getByRole('button', { name: 'Publish' }).click();
      // await expect(page.getByText('Published').first()).toBeVisible();
    });
  });
});
