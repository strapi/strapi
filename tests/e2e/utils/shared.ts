import { test, Page, expect } from '@playwright/test';
import { waitForRestart } from './restart';
import pluralize from 'pluralize';
import { kebabCase } from 'lodash/fp';

/**
 * Execute a test suite only if the condition is true
 */
export const describeOnCondition = (shouldDescribe: boolean) =>
  shouldDescribe ? test.describe : test.describe.skip;

/**
 * Navigate to a page and confirm the header, awaiting each step
 */
export const navToHeader = async (page: Page, navItems: string[], headerText: string) => {
  for (const navItem of navItems) {
    // This does not use getByRole because sometimes "Settings" is "Settings 1" if there's a badge notification
    // BUT if we don't match exact it conflicts with "Advanceed Settings"
    // As a workaround, we implement our own startsWith with page.locator
    const item = page.locator(`role=link[name^="${navItem}"]`);
    await expect(item).toBeVisible();
    await item.click();
  }

  const header = page.getByRole('heading', { name: headerText, exact: true });
  await expect(header).toBeVisible();
  return header;
};

/**
 * Skip the tour if the modal is visible
 */
export const skipCtbTour = async (page: Page) => {
  const modalSelector = 'role=button[name="Skip the tour"]';

  try {
    await page.waitForSelector(modalSelector, { timeout: 1000 });
    const modal = page.locator(modalSelector);
    if (await modal.isVisible()) {
      await modal.click();
      await expect(modal).not.toBeVisible();
    }
  } catch (e) {
    // The modal did not appear, continue with the test
  }
};

/**
 * Look for an element containing text, and then click a sibling close button
 */
export const findAndClose = async (
  page: Page,
  text: string,
  role: string = 'status',
  closeLabel: string = 'Close'
) => {
  // Verify the popup text is visible.
  await expect(page.locator(`:has-text("${text}")[role="${role}"]`)).toBeVisible();

  // Find the 'Close' button that is a sibling of the element containing the specified text.
  const closeBtn = await page.locator(
    `:has-text("${text}")[role="${role}"] ~ button[aria-label="${closeLabel}"]`
  );

  // Click the 'Close' button.
  await closeBtn.click();
};

type ContentTypeData = {
  name: string;
  pluralId?: string;
  singularId?: string;
};

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
