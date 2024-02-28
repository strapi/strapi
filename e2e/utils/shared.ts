import { test, Page, expect } from '@playwright/test';

/**
 * Execute a test suite only if the condition is true
 */
export const describeOnCondition = (shouldDescribe: boolean) =>
  shouldDescribe ? test.describe : test.describe.skip;

/**
 * Execute a test suite only if the condition is true
 */
type Role = Parameters<Page['getByRole']>[0];
type GetByRoleOptions = Parameters<Page['getByRole']>[1];

export const waitVisible = async (page: Page, role: Role, name: GetByRoleOptions['name']) => {
  // Use waitFor() on the locator to wait for the element to become visible
  const headerLocator = page.getByRole(role, { name });
  await headerLocator.waitFor({ state: 'visible' });
};

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

export const delay = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
