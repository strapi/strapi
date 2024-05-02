import { test, Page, expect, Locator } from '@playwright/test';

/**
 * Execute a test suite only if the condition is true
 */
export const describeOnCondition = (shouldDescribe: boolean) =>
  shouldDescribe ? test.describe : test.describe.skip;

type NavItem = string | [string, string] | Locator;

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

  const header = page.getByRole('heading', { name: headerText, exact: true }).last();

  await expect(header).toBeVisible();
  return header;
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
    `:has-text("${text}")[role="${role}"] ~ button:has-text("${closeLabel}")`
  );

  // Click the 'Close' button.
  await closeBtn.click();
};
