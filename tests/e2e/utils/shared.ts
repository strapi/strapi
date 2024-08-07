import { test, expect, type Page, type Locator } from '@playwright/test';
import { waitForRestart } from './restart';
import pluralize from 'pluralize';
import { kebabCase } from 'lodash/fp';

type NavItem = string | [string, string] | Locator;

/**
 * Execute a test suite only if the condition is true
 */
export const describeOnCondition = (shouldDescribe: boolean) =>
  shouldDescribe ? test.describe : test.describe.skip;

/**
 * Find an element in the dom after the previous element
 * Useful for narrowing down which link to click when there are multiple with the same name
 */
// TODO: instead of siblingText + linkText, accept an array of any number items
export const locateFirstAfter = async (page: Page, firstText: string, secondText: string) => {
  // It first searches for text containing "firstText" then uses xpath `following` to find "secondText" after it.
  // `translate` is used to make the search case-insensitive
  const item = page
    .locator(
      `xpath=//text()[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${firstText.toLowerCase()}")]/following::a[starts-with(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${secondText.toLowerCase()}")]`
    )
    .first();

  return item;
};

/**
 * Navigate to a page and confirm the header, awaiting each step
 */
export const navToHeader = async (page: Page, navItems: NavItem[], headerText: string) => {
  for (const navItem of navItems) {
    // This handles some common issues
    // 1. Uses name^= to only ensure starts with, because for example badge notifications cause "Settings" to really be "Settings 1"
    // 2. To avoid duplicates, we accept a locator
    // 3. To avoid duplicates and writing complex locators, we accept an array to pass to locateFirstAfter, which matches item0 then finds the next item1 in the dom
    let item;
    if (typeof navItem === 'string') {
      item = page.locator(`role=link[name^="${navItem}"]`).last();
    } else if (Array.isArray(navItem)) {
      item = await locateFirstAfter(page, navItem[0], navItem[1]);
    } else {
      // it's a Locator
      item = navItem;
    }

    await expect(item).toBeVisible();
    await item.click();
  }

  // Verify header is correct
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
  const elements = page.locator(`:has-text("${text}")[role="${role}"]`);
  await expect(elements.first()).toBeVisible(); // expect at least one element

  // Find all 'Close' buttons that are siblings of the elements containing the specified text.
  const closeBtns = page.locator(
    `:has-text("${text}")[role="${role}"] ~ button:has-text("${closeLabel}")`
  );

  // Click all 'Close' buttons.
  const count = await closeBtns.count();
  for (let i = 0; i < count; i++) {
    await closeBtns.nth(i).click();
  }
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
