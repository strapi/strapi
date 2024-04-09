import { test, Page, expect } from '@playwright/test';

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
