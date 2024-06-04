import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { findAndClose } from '../../utils/shared';
import { is } from 'core-js/core/object';

type Field = {
  name: string;
  value: string;
  newValue?: string;
  role?: string;
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

  const FIELDS_TO_TEST = [
    { name: 'uniqueString', value: 'unique', newValue: 'unique-1' },
    { name: 'uniqueNumber', value: '10', newValue: '20' },
    { name: 'uniqueEmail', value: 'test@testing.com', newValue: 'editor@testing.com' },
    { name: 'uniqueDate', value: '01/01/2024', newValue: '02/01/2024', role: 'combobox' },
    { name: 'UID', value: 'unique', newValue: 'unique-1' },
    {
      name: 'ComponentTextShort',
      value: 'unique',
      newValue: 'unique-1',
      component: {
        isSingle: true,
      },
    },
    {
      name: 'ComponentTextLong',
      value:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehe.',
      newValue:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      component: {
        isSingle: true,
      },
    },
    {
      name: 'ComponentNumberInteger',
      value: '10',
      newValue: '20',
      component: {
        isSingle: true,
      },
    },
    {
      name: 'ComponentNumberFloat',
      value: '3.14',
      newValue: '3.1415926535897',
      component: {
        isSingle: true,
      },
    },
    {
      name: 'ComponentEmail',
      value: 'test@strapi.io',
      newValue: 'test+update@strapi.io',
      component: {
        isSingle: true,
      },
    },
  ] as const satisfies Array<Field>;

  const clickSave = async (page) => {
    await page.getByRole('button', { name: 'Save' }).isEnabled();
    await page.getByRole('tab', { name: 'Draft' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
  };

  const CREATE_URL =
    /\/admin\/content-manager\/collection-types\/api::unique.unique\/create(\?.*)?/;
  const LIST_URL = /\/admin\/content-manager\/collection-types\/api::unique.unique(\?.*)?/;
  const EDIT_URL = /\/admin\/content-manager\/collection-types\/api::unique.unique\/[^/]+(\?.*)?/;

  /**
   * @note the unique content type is set up with every type of document level unique field.
   * We are testing that uniqueness is enforced for these fields across all entries of a content type in the same locale.
   */
  FIELDS_TO_TEST.forEach((field) => {
    test(`A user should not be able to duplicate the ${field.name} document field value in the same content type and dimensions (locale + publication state).`, async ({
      page,
    }) => {
      await page.getByRole('link', { name: 'Create new entry' }).first().click();

      await page.waitForURL(CREATE_URL);

      const extraComponentNavigation = async () => {
        if ('component' in field) {
          const isSingle = field.component.isSingle;

          // This opens up the component UI so we can access the field we are
          // testing against

          // TODO check best way using playwright selectors
          if (isSingle) {
            await page.getByRole('button', { name: 'No entry yet. Click on the' }).first().click();
            await page.getByRole('button', { name: 'No entry yet. Click on the' }).first().click();
          }
        }
      };

      /**
       * Now we're in the edit view. The content within each entry will be valid from the previous test run.
       */

      const fieldRole = 'role' in field ? field.role : 'textbox';

      await extraComponentNavigation();
      await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

      await clickSave(page);
      await findAndClose(page, 'Saved document');

      await page.getByRole('link', { name: 'Unique' }).click();
      await page.waitForURL(LIST_URL);

      /**
       * Try to create another entry with the same value, the validation should fail
       */
      await page.getByRole('link', { name: 'Create new entry' }).first().click();

      await page.waitForURL(CREATE_URL);

      await extraComponentNavigation();
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

      await extraComponentNavigation();
      await page.getByRole(fieldRole, { name: field.name }).fill(field.value);

      await clickSave(page);
      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page.getByText('Published document')).toBeVisible();
    });
  });
});
