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
