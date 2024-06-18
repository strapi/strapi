import { test, expect, Page } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { findAndClose } from '../../utils/shared';

type Field = {
  name: string;
  value: string;
  newValue?: string;
  role?: 'combobox' | 'textbox';
  component?: {
    isSingle: boolean;
  };
};

test.describe('Uniqueness', () => {
  test.beforeEach(async ({ page }) => {
    // Reset the DB and also specify that we are wiping all entries of the unique content type each time
    await resetDatabaseAndImportDataFromPath('with-admin.tar');

    await page.goto('/admin');
    await login({ page });

    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Unique' }).click();
  });

  const SCALAR_FIELDS_TO_TEST: Field[] = [
    { name: 'uniqueString', value: 'unique', newValue: 'unique-1' },
    { name: 'uniqueNumber', value: '10', newValue: '20' },
    { name: 'uniqueEmail', value: 'test@strapi.io', newValue: 'test+update@strapi.io' },
    { name: 'uniqueDate', value: '01/01/2024', newValue: '02/01/2024', role: 'combobox' },
    { name: 'UID', value: 'unique', newValue: 'unique-1' },
  ];

  const SINGLE_COMPONENT_FIELDS_TO_TEST: Field[] = [
    {
      name: 'ComponentTextShort',
      value: 'unique',
      newValue: 'unique-1',
      component: { isSingle: true },
    },
    {
      name: 'ComponentTextLong',
      value: 'unique',
      newValue: 'unique-1',
      component: { isSingle: true },
    },
    {
      name: 'ComponentNumberInteger',
      value: '10',
      newValue: '20',
      component: { isSingle: true },
    },
    {
      name: 'ComponentNumberFloat',
      value: '3.14',
      newValue: '3.1415926535897',
      component: { isSingle: true },
    },
    {
      name: 'ComponentEmail',
      value: 'test@strapi.io',
      newValue: 'test+update@strapi.io',
      component: { isSingle: true },
    },
  ];

  const REPEATABLE_COMPONENT_FIELDS_TO_TEST: Field[] = [
    {
      name: 'ComponentTextShort',
      value: 'unique',
      newValue: 'unique-2',
      component: { isSingle: false },
    },
    {
      name: 'ComponentTextLong',
      value: 'unique',
      newValue: 'unique-2',
      component: { isSingle: false },
    },
    {
      name: 'ComponentNumberInteger',
      value: '10',
      newValue: '20',
      component: { isSingle: false },
    },
    {
      name: 'ComponentNumberFloat',
      value: '3.14',
      newValue: '3.1415926535897',
      component: { isSingle: false },
    },
    {
      name: 'ComponentEmail',
      value: 'test@strapi.io',
      newValue: 'test+update@strapi.io',
      component: { isSingle: false },
    },
  ];

  const FIELDS_TO_TEST = [
    ...SCALAR_FIELDS_TO_TEST,
    ...SINGLE_COMPONENT_FIELDS_TO_TEST,
    ...REPEATABLE_COMPONENT_FIELDS_TO_TEST,
  ] as const satisfies Array<Field>;

  const CREATE_URL =
    /\/admin\/content-manager\/collection-types\/api::unique.unique\/create(\?.*)?/;
  const LIST_URL = /\/admin\/content-manager\/collection-types\/api::unique.unique(\?.*)?/;
  const EDIT_URL = /\/admin\/content-manager\/collection-types\/api::unique.unique\/[^/]+(\?.*)?/;

  const clickSave = async (page) => {
    await page.getByRole('button', { name: 'Save' }).isEnabled();
    await page.getByRole('tab', { name: 'Draft' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
  };

  const extraComponentNavigation = async (field: Field, page: Page) => {
    if ('component' in field) {
      const isSingle = field.component.isSingle;

      // This opens up the component UI so we can access the field we are
      // testing against

      if (isSingle) {
        await page.getByRole('button', { name: 'No entry yet. Click on the' }).first().click();
        await page.getByRole('button', { name: 'No entry yet. Click on the' }).first().click();
      } else {
        await page.getByRole('button', { name: 'No entry yet. Click on the' }).nth(1).click();
        await page
          .getByLabel('', { exact: true })
          .getByRole('button', { name: 'No entry yet. Click on the' })
          .click();
      }
    }
  };

  /**
   * @note the unique content type is set up with every type of document level unique field.
   * We are testing that uniqueness is enforced for these fields across all entries of a content type in the same locale.
   */
  FIELDS_TO_TEST.forEach((field) => {
    const isComponent = 'component' in field;
    const isSingleComponentField = isComponent && field.component.isSingle;
    const isRepeatableComponentField = isComponent && !field.component.isSingle;

    let fieldDescription = 'scalar field';
    if (isComponent) {
      fieldDescription = isSingleComponentField
        ? 'single component field'
        : 'repeatable component field';
    }

    test(`A user should not be able to duplicate the ${field.name} ${fieldDescription} value in the same content type and dimensions (locale + publication state).`, async ({
      page,
    }) => {
      await page.getByRole('link', { name: 'Create new entry' }).first().click();

      await page.waitForURL(CREATE_URL);

      /**
       * Now we're in the edit view. The content within each entry will be valid from the previous test run.
       */

      const fieldRole = 'role' in field ? field.role : 'textbox';

      await extraComponentNavigation(field, page);
      await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

      if (isRepeatableComponentField) {
        // Add another entry to the repeatable component in this entry that
        // shares the same value as the first entry. This should trigger a
        // validation error

        await page.getByRole('button', { name: 'Add an entry' }).click();
        await page
          .getByRole('region')
          .getByRole('button', { name: 'No entry yet. Click on the' })
          .click();
        await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

        await clickSave(page);

        await expect(page.getByText('Warning:2 errors occurred')).toBeVisible();
        await expect(page.getByText('This attribute must be unique')).toBeVisible();
        await page.getByRole('button', { name: 'Delete' }).nth(1).click();
      }

      await clickSave(page);
      await findAndClose(page, 'Saved document');

      await page.getByRole('link', { name: 'Unique' }).click();
      await page.waitForURL(LIST_URL);

      /**
       * Try to create another entry with the same value, the validation should fail
       */
      await page.getByRole('link', { name: 'Create new entry' }).first().click();

      await page.waitForURL(CREATE_URL);

      await extraComponentNavigation(field, page);
      await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

      await clickSave(page);
      await expect(page.getByText('Warning:This attribute must be unique')).toBeVisible();
      /**
       * Modify the value and try again, this should save successfully
       * Either take the new value provided in the field object or generate a random new one
       */
      await page
        .getByRole(fieldRole, {
          name: field.name,
        })
        .fill(field.newValue);

      await clickSave(page);
      await expect(page.getByText('Saved document')).toBeVisible();

      await page.getByRole('link', { name: 'Unique' }).click();
      await page.waitForURL(LIST_URL);

      /**
       * Change locale and try to create an entry with the same value as our first entry, this should save successfully
       */
      await page.getByRole('combobox', { name: 'Select a locale' }).click();

      await page.getByText('French (fr)').click();

      await page.getByRole('link', { name: 'Create new entry' }).first().click();

      await page.waitForURL(EDIT_URL);

      await extraComponentNavigation(field, page);
      await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

      await clickSave(page);
      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page.getByText('Published document')).toBeVisible();
    });
  });
});
