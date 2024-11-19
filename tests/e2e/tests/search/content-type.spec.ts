import { test, expect } from '@playwright/test';

import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { clickAndWait, navToHeader } from '../../utils/shared';

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
  });

  // TODO: Extremely long search string

  // TODO: Clearing the search box

  test('ASCII (no spaces)', async ({ page }) => {
    const searchTerm = 'Nike';

    // create doc that shouldn't be found
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
    await page.getByRole('textbox', { name: 'name' }).fill('Product 1');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

    // search for searchTerm
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.fill('input[name="search"]', searchTerm);
    await page.locator('input[name="search"]').press('Enter');

    // check that only expected results are found
    const tableWithProduct = page.locator('table:has-text("' + searchTerm + '")');
    const rows = tableWithProduct.locator('tr');
    await expect(rows).toHaveCount(2);
  });

  //
  // TODO: The tests below here are currently skipped because of an actual bug that needs to be fixed regarding url encoding params
  //

  test.fixme('ASCII (spaces)', async ({ page }) => {
    // space tests that url encoding is done correctly
    const searchTerm = 'Product 2';

    // create first doc
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
    await page.getByRole('textbox', { name: 'name' }).fill('Product 1');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

    // create second doc
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
    await page.getByRole('textbox', { name: 'name' }).fill(searchTerm);
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

    // search for searchTerm
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.fill('input[name="search"]', searchTerm);
    await page.locator('input[name="search"]').press('Enter');

    const tableWithProduct = page.locator('table:has-text("Product")');
    const rows = tableWithProduct.locator('tr');
    await expect(rows).toHaveCount(2);

    await page.getByRole('link', { name: 'asdfasdfasdfas' }).click();
  });

  test.fixme('extended ASCII', async ({ page }) => {
    const searchTerm = 'Café';

    // Create document
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
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
    await expect(rows).toHaveCount(2);
  });

  // Unicode Search Test
  test.fixme('Unicode', async ({ page }) => {
    const searchTerm = '商品';

    // Create document
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
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
    await expect(rows).toHaveCount(2);
  });

  test.fixme('emojis', async ({ page }) => {
    const searchTerm = '🎉🎉🎉';

    // Create document
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
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
    await expect(rows).toHaveCount(2);
  });

  test.fixme('Special characters', async ({ page }) => {
    const searchTerm = 'Product & = + # Test';

    // Create document
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
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
    await expect(rows).toHaveCount(2);
  });

  test.fixme('Mixed encoding', async ({ page }) => {
    const searchTerm = '商品 🎉 Café & # 1';

    // Create document
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
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
    await expect(rows).toHaveCount(2);
  });
});
