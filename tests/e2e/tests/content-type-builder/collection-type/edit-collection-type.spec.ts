import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { waitForRestart } from '../../../utils/restart';
import { resetFiles } from '../../../utils/file-reset';
import { kebabCase, snakeCase } from 'lodash/fp';
import pluralize from 'pluralize';
import { navToHeader, skipCtbTour } from '../../../utils/shared';

type ContentTypeData = {
  name: string;
  pluralId?: string;
  singularId?: string;
};
const createCollectionType = async (page, data) => {
  const { name, singularId, pluralId } = data;

  await page.getByRole('button', { name: 'Create new collection type' }).click();

  await expect(page.getByRole('heading', { name: 'Create a collection type' })).toBeVisible();

  const displayName = page.getByLabel('Display name');
  await displayName.fill(name);

  const singularIdField = page.getByLabel('API ID (Singular)');
  await expect(singularIdField).toHaveValue(singularId || kebabCase(name));
  if (singularId) {
    singularIdField.fill(singularId);
  }

  const pluralIdField = page.getByLabel('API ID (Plural)');
  await expect(pluralIdField).toHaveValue(pluralId || pluralize(kebabCase(name)));
  if (pluralId) {
    pluralIdField.fill(pluralId);
  }

  await page.getByRole('button', { name: 'Continue' }).click();

  // Create an initial text field for it
  await expect(page.getByText('Select a field for your collection type')).toBeVisible();
  await page.getByText('Small or long text').click();
  await page.getByLabel('Name', { exact: true }).fill('myattribute');
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await waitForRestart(page);

  await expect(page.getByRole('heading', { name })).toBeVisible();
};

test.describe('Edit collection type', () => {
  // use a name with a capital and a space to ensure we also test the kebab-casing conversion for api ids
  const ctName = 'Secret Document';

  test.beforeEach(async ({ page }) => {
    await resetFiles();
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');

    await login({ page });

    await page.getByRole('link', { name: 'Content-Type Builder' }).click();

    await skipCtbTour(page);

    // TODO: create a "saveFileState" mechanism to be used so we don't have to do a full server restart before each test
    // create a collection type to be used
    await createCollectionType(page, {
      name: ctName,
    });

    await navToHeader(page, ['Content-Type Builder', ctName], ctName);
  });

  // TODO: each test should have a beforeAll that does this, maybe combine all the setup into one util to simplify it
  // to keep other suites that don't modify files from needing to reset files, clean up after ourselves at the end
  test.afterAll(async () => {
    await resetFiles();
  });

  test('Can toggle internationalization', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Internationalization').click();
    await page.getByRole('button', { name: 'Finish' }).click();

    await waitForRestart(page);

    await expect(page.getByRole('heading', { name: 'Secret Document' })).toBeVisible();
  });

  test('Can toggle draft&publish', async ({ page }) => {    
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByText('Draft & publish').click();
    await page.getByRole('button', { name: 'Yes, disable' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();

    await waitForRestart(page);

    await expect(page.getByRole('heading', { name: 'Secret Document' })).toBeVisible();
  });

  test('Can add a field with default value', async ({ page }) => {
    await page.getByRole('button', { name: 'Add another field', exact: true }).click();
    await page.getByRole('button', { name: 'Text Small or long text like title or description' }).click();
    await page.getByLabel('Name', { exact: true }).fill('testfield');
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByRole('textbox', { name: 'Default value' }).fill('mydefault');
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await waitForRestart(page);

    await expect(page.getByRole('heading', { name: 'Secret Document' })).toBeVisible();
  });
});
