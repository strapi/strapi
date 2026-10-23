import { test, expect, Page } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';

const SOURCE_PRODUCT = 'Copy source product';
const TARGET_PRODUCT = 'Copy target product';
const VARIATION_NAME = 'Large';
const VARIATION_PRICE = '42';

const startNewProduct = async (page: Page, name: string) => {
  await navToHeader(page, ['Content Manager', 'Products'], 'Products');
  await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
  await page.getByRole('textbox', { name: 'name' }).fill(name);
};

const saveProduct = async (page: Page) => {
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
  await findAndClose(page, 'Saved Document');
};

test.describe('Copy components from existing entries', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('As a user I want to copy the component of another entry into a repeatable component', async ({
    page,
  }) => {
    /**
     * Create the entry to copy from, with one variation.
     */
    await startNewProduct(page, SOURCE_PRODUCT);
    // the product has two component fields, the variations come last
    await clickAndWait(
      page,
      page.getByRole('button', { name: 'No entry yet. Click to add one.' }).last()
    );
    await clickAndWait(page, page.getByRole('menuitem', { name: 'Empty entry' }));
    // the first "name" field is the product's, the second one is the variation's
    await page.getByRole('textbox', { name: 'name' }).nth(1).fill(VARIATION_NAME);
    await page.getByRole('textbox', { name: 'price' }).fill(VARIATION_PRICE);
    await saveProduct(page);

    /**
     * Create another entry and copy the variation into it.
     */
    await startNewProduct(page, TARGET_PRODUCT);
    await clickAndWait(
      page,
      page.getByRole('button', { name: 'No entry yet. Click to add one.' }).last()
    );
    await clickAndWait(page, page.getByRole('menuitem', { name: 'Use existing content…' }));

    const modal = page.getByRole('dialog', { name: 'Copy existing variations' });
    await expect(modal).toBeVisible();

    // seeded products have no variation, they can't be copied from
    await expect(modal.getByRole('button', { name: /T-shirt/ })).toBeDisabled();
    await expect(modal.getByRole('button', { name: /T-shirt/ })).toContainText('No variations yet');

    await modal.getByRole('button', { name: new RegExp(SOURCE_PRODUCT) }).click();
    // the only variation of the entry is selected right away
    await expect(modal.getByRole('checkbox', { name: VARIATION_NAME })).toBeChecked();

    await modal.getByRole('button', { name: 'Use content' }).click();
    await findAndClose(page, `1 entry copied from ${SOURCE_PRODUCT}`);

    /**
     * The copy is flagged until the entry is saved, and holds the values of the source.
     */
    const copiedVariation = page.getByRole('button', { name: VARIATION_NAME });
    await expect(copiedVariation).toBeVisible();
    await expect(page.getByText('Copied')).toBeVisible();

    await copiedVariation.click();
    await expect(page.getByRole('textbox', { name: 'price' })).toHaveValue(VARIATION_PRICE);

    await saveProduct(page);
    await expect(page.getByText('Copied')).toBeHidden();
    await expect(page.getByRole('button', { name: VARIATION_NAME })).toBeVisible();

    /**
     * The source entry is untouched.
     */
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await clickAndWait(page, page.getByRole('gridcell', { name: SOURCE_PRODUCT }));
    await expect(page.getByRole('button', { name: VARIATION_NAME })).toHaveCount(1);
  });

  test('As a user I want to replace the content of a single component with the one of another entry', async ({
    page,
  }) => {
    await startNewProduct(page, SOURCE_PRODUCT);
    // the product has two component fields, the SEO component comes first
    await clickAndWait(
      page,
      page.getByRole('button', { name: 'No entry yet. Click to add one.' }).first()
    );
    await clickAndWait(page, page.getByRole('menuitem', { name: 'Empty entry' }));
    await page.getByRole('textbox', { name: 'title' }).fill('Source SEO title');
    await saveProduct(page);

    await startNewProduct(page, TARGET_PRODUCT);
    await clickAndWait(
      page,
      page.getByRole('button', { name: 'No entry yet. Click to add one.' }).first()
    );
    await clickAndWait(page, page.getByRole('menuitem', { name: 'Empty entry' }));
    // a component that only holds its defaults offers to use existing content, not to replace it
    await expect(page.getByRole('button', { name: 'Use existing content…' })).toBeVisible();

    await page.getByRole('textbox', { name: 'title' }).fill('Target SEO title');
    await expect(page.getByRole('button', { name: 'Replace content…' })).toBeVisible();

    await clickAndWait(page, page.getByRole('button', { name: 'Replace content…' }));

    const modal = page.getByRole('dialog', { name: 'Copy an existing seo' });
    await expect(modal.getByText('This will replace the current content of seo.')).toBeVisible();
    await modal.getByRole('button', { name: new RegExp(SOURCE_PRODUCT) }).click();
    await expect(modal.getByText('Source SEO title')).toHaveCount(2);
    await modal.getByRole('button', { name: 'Replace content' }).click();
    await findAndClose(page, `seo replaced with content from ${SOURCE_PRODUCT}`);

    await expect(page.getByRole('textbox', { name: 'title' })).toHaveValue('Source SEO title');
  });
});
