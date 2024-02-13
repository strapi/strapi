import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';

test.describe('Uniqueness', () => {
  test.beforeEach(async ({ page }) => {
    // Reset the DB and also specify that we are wiping all entries of the unique content type each time
    // TODO: the default should be to wipe all entries, but we need to fix the import script first
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
  ];

  const clickSave = async (page) => {
    let isSaveable = await page.getByRole('button', { name: 'Save' }).isEnabled();
    if (!isSaveable) {
      // A fix for the date field, it needs to lose focus for the save button to be enabled
      await page.getByText('Create an entry').click();
    }

    await page.getByRole('button', { name: 'Save' }).click();
  };

  /**
   * @note the unique content type is set up with every type of document level unique field.
   * We are testing that uniqueness is enforced for these fields across all entries of a content type in the same locale.
   */
  FIELDS_TO_TEST.forEach((field) => {
    test(`A user should not be able to duplicate the ${field.name} document field value in the same content type and locale. Validation should not happen across locales`, async ({
      page,
    }) => {
      await page.locator('text=Create new entry').first().click();

      await page.waitForURL('**/content-manager/collection-types/api::unique.unique/create?**');

      /**
       * Now we're in the edit view. The content within each entry will be valid from the previous test run.
       */
      const fieldRole = field?.role ?? 'textbox';
      // @ts-expect-error – want's a const string
      await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

      await clickSave(page);
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.getByText('Back', { exact: true }).click();

      /**
       * Try to create another entry with the same value, the validation should fail
       */

      await page.locator('text=Create new entry').first().click();

      await page.waitForURL('**/content-manager/collection-types/api::unique.unique/create?**');

      // @ts-expect-error – want's a const string
      await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

      await clickSave(page);

      await expect(page.locator('text=This attribute must be unique').first()).toBeVisible();

      /**
       * Modify the value and try again, this should save successfully
       * Either take the new value provided in the field object or generate a random new one
       */
      // TODO find a better way to generate random values for all field types
      const newValue =
        field?.newValue ||
        (isNaN(Number(field.value))
          ? String.fromCharCode(Math.floor(Math.random() * 26) + 97) + field.value.substring(1)
          : `${Number(field.value) + 10}`);

      await page
        // @ts-expect-error – want's a const string
        .getByRole(fieldRole, {
          name: field.name,
        })
        .fill(newValue);

      await clickSave(page);
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.getByText('Back', { exact: true }).click();

      /**
       * Change locale and try to create an entry with the same value as our first entry, this should save successfully
       */
      await page.getByRole('combobox', { name: 'Select a locale' }).click();

      await page.getByText('French (fr)').click();

      await page.locator('text=Create new entry').first().click();

      await page.waitForURL('**/content-manager/collection-types/api::unique.unique/create?**');

      // @ts-expect-error – want's a const string
      await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

      await clickSave(page);
      await expect(page.getByText('Saved').first()).toBeVisible();

      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page.getByText('Published').first()).toBeVisible();
    });
  });
});
