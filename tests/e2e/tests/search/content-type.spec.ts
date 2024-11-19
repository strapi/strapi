import { test, expect } from '@playwright/test';

import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { clickAndWait, navToHeader } from '../../utils/shared';

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('Searching without a space works', async ({ page }) => {
    const searchTerm = 'Nike';

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

  // TODO: This is currently skipped because of an actual bug that needs to be fixed before this is enabled
  test.fixme('Searching with a space works', async ({ page }) => {
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');

    // create first doc
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
    await page.getByRole('textbox', { name: 'name' }).fill('Product 1');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

    // create second doc
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
    await page.getByRole('textbox', { name: 'name' }).fill('Product 2');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Back' }));

    // TODO: remove this, for some reason playwright trace only shows white screen without this even though it works
    await page.reload();

    // search for 'Product 2' (the space is important because it tests character encoding for _q param)
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.fill('input[name="search"]', 'Product');
    await page.locator('input[name="search"]').press('Enter');

    const tableWithProduct = page.locator('table:has-text("Product")');
    const rows = tableWithProduct.locator('tr');
    await expect(rows).toHaveCount(2);

    await page.getByRole('link', { name: 'asdfasdfasdfas' }).click();
  });
});
