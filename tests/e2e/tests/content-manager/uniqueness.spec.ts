import { test, expect, Page } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { findAndClose } from '../../utils/shared';

type Field = {
  name: string;
  value: string;
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

  const SCALAR_FIELDS: Field[] = [
    { name: 'uniqueString', value: 'unique' },
    { name: 'uniqueNumber', value: '10' },
    { name: 'uniqueEmail', value: 'test@strapi.io' },
    { name: 'uniqueDate', value: '01/01/2024', role: 'combobox' },
    { name: 'UID', value: 'unique' },
  ];

  const SINGLE_COMPONENT_FIELDS: Field[] = [
    {
      name: 'ComponentTextShort',
      value: 'unique',
      component: { isSingle: true },
    },
    {
      name: 'ComponentTextLong',
      value: 'unique',
      component: { isSingle: true },
    },
    {
      name: 'ComponentNumberInteger',
      value: '10',
      component: { isSingle: true },
    },
    {
      name: 'ComponentNumberFloat',
      value: '3.14',
      component: { isSingle: true },
    },
    {
      name: 'ComponentEmail',
      value: 'test@strapi.io',
      component: { isSingle: true },
    },
  ];

  const REPEATABLE_COMPONENT_FIELDS: Field[] = [
    {
      name: 'ComponentTextShort',
      value: 'unique',
      component: { isSingle: false },
    },
    {
      name: 'ComponentTextLong',
      value: 'unique',
      component: { isSingle: false },
    },
    {
      name: 'ComponentNumberInteger',
      value: '10',
      component: { isSingle: false },
    },
    {
      name: 'ComponentNumberFloat',
      value: '3.14',
      component: { isSingle: false },
    },
    {
      name: 'ComponentEmail',
      value: 'test@strapi.io',
      component: { isSingle: false },
    },
  ];

  const FIELDS_TO_TEST = [
    ...SCALAR_FIELDS,
    ...SINGLE_COMPONENT_FIELDS,
    ...REPEATABLE_COMPONENT_FIELDS,
  ] as const satisfies Array<Field>;

  const CREATE_URL =
    /\/admin\/content-manager\/collection-types\/api::unique.unique\/create(\?.*)?/;
  const LIST_URL = /\/admin\/content-manager\/collection-types\/api::unique.unique(\?.*)?/;
  const EDIT_URL = /\/admin\/content-manager\/collection-types\/api::unique.unique\/[^/]+(\?.*)?/;

  const clickSave = async (page: Page) => {
    await page.getByRole('button', { name: 'Save' }).isEnabled();
    await page.getByRole('tab', { name: 'Draft' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved document')).toBeVisible();
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

  const createNewEntry = async (page: Page, url: RegExp) => {
    await page.getByRole('link', { name: 'Create new entry' }).first().click();
    await page.waitForURL(url);
  };

  const fillField = async (page: Page, field: Field, fieldRole: 'combobox' | 'textbox') => {
    await extraComponentNavigation(field, page);
    await page.getByRole(fieldRole, { name: field.name }).fill(field.value);
  };

  const publishDocument = async (page: Page) => {
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Published document')).toBeVisible();
  };

  const navigateToListView = async (page: Page) => {
    await page.getByRole('link', { name: 'Unique' }).click();
    if (await page.getByText('Confirmation').isVisible()) {
      await page.getByRole('button', { name: 'Confirm' }).click();
    }

    await page.waitForURL(LIST_URL);
  };

  const changeLocale = async (page: Page, locale: string) => {
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    await page.getByText(locale).click();
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
      await createNewEntry(page, CREATE_URL);

      const fieldRole = 'role' in field ? field.role : 'textbox';
      await fillField(page, field, fieldRole);

      if (isRepeatableComponentField) {
        // If the field is a repeatable component field, we add an entry and fill
        // it with the same value to test uniqueness within the same entity.
        await page.getByRole('button', { name: 'Add an entry' }).click();
        await page
          .getByRole('region')
          .getByRole('button', { name: 'No entry yet. Click on the' })
          .click();
        await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

        await clickSave(page);
        await findAndClose(page, 'Saved document');

        await page.getByRole('button', { name: 'Publish' }).click();
        await expect(page.getByText('Warning:2 errors occurred')).toBeVisible();

        await page.getByRole('button', { name: 'Delete' }).nth(1).click();
      }

      await clickSave(page);
      await findAndClose(page, 'Saved document');

      await navigateToListView(page);

      await createNewEntry(page, CREATE_URL);
      await fillField(page, field, fieldRole);

      await clickSave(page);
      await findAndClose(page, 'Saved document');

      await publishDocument(page);
      await findAndClose(page, 'Published document');

      await navigateToListView(page);

      await createNewEntry(page, CREATE_URL);
      await fillField(page, field, fieldRole);

      await clickSave(page);
      await findAndClose(page, 'Saved document');

      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page.getByText('Warning:This attribute must be unique')).toBeVisible();

      await navigateToListView(page);
      await changeLocale(page, 'French (fr)');

      await createNewEntry(page, EDIT_URL);
      await fillField(page, field, fieldRole);

      await clickSave(page);
      await findAndClose(page, 'Saved document');

      await publishDocument(page);
      await findAndClose(page, 'Published document');
    });
  });
});
