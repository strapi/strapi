import { kebabCase } from 'lodash/fp';
import { waitForRestart } from './restart';
import pluralize from 'pluralize';

export const createSingleType = async (page, data) => {
  const { name, singularId, pluralId } = data;

  await page.getByRole('button', { name: 'Create new single type' }).click();

  await expect(page.getByRole('heading', { name: 'Create a single type' })).toBeVisible();

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
  await expect(page.getByText('Select a field for your single type')).toBeVisible();
  await page.getByText('Small or long text').click();
  await page.getByLabel('Name', { exact: true }).fill('myattribute');
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await waitForRestart(page);

  await expect(page.getByRole('heading', { name })).toBeVisible();
};

export const createCollectionType = async (page, data) => {
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
