import { test, expect, type Page, type Locator } from '@playwright/test';

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
 * Clicks on a link and waits for the page to load completely.
 *
 * NOTE: this util is used to avoid inconsistent behaviour on webkit
 *
 */
export const clickAndWait = async (page: Page, locator: Locator) => {
  await locator.click();

  if (page.context().browser()?.browserType().name() === 'webkit') {
    await page.waitForLoadState('networkidle');
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

/**
 * Finds a specific cell in a table by matching both the row text and the column header text.
 *
 * This function performs the following steps:
 * 1. Finds a row in the table that contains the specified `rowText` (case-insensitive).
 * 2. Finds the column header in the table that contains the specified `columnText` (case-insensitive).
 * 3. Identifies the cell in the located row that corresponds to the column where the header matches the `columnText`.
 * 4. Returns the found cell for further interactions or assertions.
 *
 * @param {Page} page - The Playwright `Page` object representing the browser page.
 * @param {string} rowText - The text to match in the row (case-insensitive).
 * @param {string} columnText - The text to match in the column header (case-insensitive).
 *
 * @returns {Locator} - A Playwright Locator object representing the intersecting cell.
 *
 * @throws Will throw an error if the row or column header is not found, or if the cell is not visible.
 *
 * @warning This function assumes a standard table structure where each row has an equal number of cells,
 *          and no cells are merged (`colspan` or `rowspan`). If the table contains merged cells,
 *          this method may return incorrect results or fail to locate the correct cell.
 *          Matches the header exactly (cell contains only exact text)
 *          Matches the row loosely (finds a row containing that text somewhere)
 */
export const findByRowColumn = async (page: Page, rowText: string, columnText: string) => {
  // Locate the row that contains the rowText
  // This just looks for the text in a row, so ensure that it is specific enough
  const row = page.locator('tr').filter({ hasText: new RegExp(`${rowText}`) });
  await expect(row).toBeVisible();

  // Locate the column header that matches the columnText
  // This assumes that header is exact (cell only contains that text and nothing else)
  const header = page.locator('thead th').filter({ hasText: new RegExp(`^${columnText}$`, 'i') });
  await expect(header).toBeVisible();

  // Find the index of the matching column header
  const columnIndex = await header.evaluate((el) => Array.from(el.parentNode.children).indexOf(el));

  // Find the cell in the located row that corresponds to the matching column index
  const cell = row.locator(`td:nth-child(${columnIndex + 1})`);
  await expect(cell).toBeVisible();

  // Return the found cell
  return cell;
};
