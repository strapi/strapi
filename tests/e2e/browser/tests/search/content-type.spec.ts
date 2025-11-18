import { test, expect } from '@playwright/test';

import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { clickAndWait, navToHeader } from '../../utils/shared';

function createSearchTest(testFunction, description, searchTerm) {
  testFunction(description, async ({ page }) => {
    // Create document
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
    await page.getByRole('textbox', { name: 'name' }).fill(searchTerm);
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

    // Search
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.fill('input[name="search"]', searchTerm);
    await page.locator('input[name="search"]').press('Enter');

    // Assert
    const tableWithProduct = page.locator('table:has-text("' + searchTerm + '")');
    const rows = tableWithProduct.locator('tr');

    // Note that there is already an item in there, so if search didn't filter this would be 3 or more
    await expect(rows).toHaveCount(2);
  });
}

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
  });

  // TODO: Test clearing the search box

  // The testFn is necessary so that we can skip tests
  const testCases = [
    // TODO: Test extremely long search string
    { testFn: test, description: 'ASCII (no spaces)', searchTerm: 'TestMe' },
    { testFn: test.fixme, description: 'ASCII (spaces)', searchTerm: 'Product 2' },
    { testFn: test.fixme, description: 'extended ASCII', searchTerm: 'Café' },
    { testFn: test.fixme, description: 'Unicode', searchTerm: '商品' },
    { testFn: test.fixme, description: 'emojis', searchTerm: '🎉🎉🎉' },
    { testFn: test.fixme, description: 'Special characters', searchTerm: 'Product & = + # Test' },
    { testFn: test.fixme, description: 'Mixed encoding', searchTerm: '商品 🎉 Café & # 1' },
  ];

  testCases.forEach(({ testFn, description, searchTerm }) => {
    createSearchTest(testFn, description, searchTerm);
  });
});
