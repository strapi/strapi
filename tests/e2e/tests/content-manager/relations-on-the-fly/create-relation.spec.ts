import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { clickAndWait } from '../../../utils/shared';

const CREATE_URL = /\/admin\/content-manager\/collection-types\/api::author.author\/create(\?.*)?/;

test.describe('Relations on the fly - Create a Relation', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('I want to create a new relation, save the related document and check if the new relation is added to the parent document', async ({
    page,
  }) => {
    // Step 1. Got to Article collection-type and open one article
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Step 2. Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    // Step 3. Edit the form
    await expect(page.getByRole('banner').getByText('Create a relation')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();
    const name = page.getByRole('textbox', { name: 'name' });
    await expect(name).toHaveValue('');
    await name.fill('Mr. Plop');
    await expect(name).toHaveValue('Mr. Plop');

    // Step 4. Save the related document as draft
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await expect(name).toHaveValue('Mr. Plop');
    await expect(page.getByRole('status', { name: 'Draft' }).first()).toBeVisible();

    // Step 5. Close the relation modal to see the updated relation on the root document
    await page.getByRole('button', { name: 'Close modal' }).click();
    await expect(page.getByRole('button', { name: 'Mr. Plop' })).toBeVisible();
  });

  test('I want to create a new relation, publish the related document and check if the new relation is added to the parent document', async ({
    page,
  }) => {
    // Step 1. Got to Article collection-type and open one article
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Step 2. Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    // Step 3. Edit the form
    const name = page.getByRole('textbox', { name: 'name' });
    await expect(name).toHaveValue('');
    await name.fill('Mr. Fred Passo');
    await expect(name).toHaveValue('Mr. Fred Passo');

    // Step 4. Publish the related document
    await clickAndWait(page, page.getByRole('button', { name: 'Publish' }));
    await expect(name).toHaveValue('Mr. Fred Passo');
    await expect(page.getByRole('status', { name: 'Published' }).first()).toBeVisible();

    // Step 5. Close the relation modal to see the updated relation on the root document
    await page.getByRole('button', { name: 'Close modal' }).click();
    await expect(page.getByRole('button', { name: 'Mr. Fred Passo' })).toBeVisible();
  });

  test('I want to create a new relation in a modal and open it in full page', async ({ page }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();

    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();
    await expect(page.getByText('Create a relation')).toBeVisible();

    // click on the full page icon
    await clickAndWait(page, page.getByRole('button', { name: 'Go to entry' }));
    await page.waitForURL(CREATE_URL);
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
  });

  test('I want to click on a new relation in the create relation modal without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Hair');

    // Open a new relation in the articles field
    await clickAndWait(page, page.getByRole('combobox', { name: 'articles' }));
    await page.getByRole('option', { name: 'Create a relation' }).click();

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    // Check the nested relation modal is shown
    await expect(page.getByRole('banner').getByText('Create a relation')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();
    // and the back button is disabled
    await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  test('I want to add a new relation and edit it in the create relation modal without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Hair');

    // Open a new relation in the articles field
    await clickAndWait(page, page.getByRole('combobox', { name: 'articles' }));
    await page.getByRole('option', { name: 'West Ham post match analysis' }).click();
    await clickAndWait(page, page.getByRole('button', { name: 'West Ham post match analysis' }));

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    // Check the nested relation modal is shown
    await expect(page.getByRole('banner').getByText('Edit a relation')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();
    // and the back button is disabled
    await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  test('I want to click to close the relation modal without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Hair');

    // Click the Close button
    await clickAndWait(page, page.getByRole('button', { name: 'Close modal' }));

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();
  });

  test('I want to click the button to open the full page without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Hair');

    // click on the full page icon
    await clickAndWait(page, page.getByRole('button', { name: 'Go to entry' }));

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    await page.waitForURL(CREATE_URL);
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
  });

  test('I want to click the back button to open the previous relation without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await clickAndWait(page, page.getByRole('button', { name: 'Coach Beard' }));

    // Open a nested relation
    await clickAndWait(page, page.getByRole('button', { name: 'West Ham post match analysis' }));
    // Open the relation modal
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();

    // Change the name of the author
    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Hair');

    // click on the Back button
    await clickAndWait(page, page.getByRole('button', { name: 'Back' }));

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();
  });

  test('I want to create a relation inside a component, and save', async ({ page }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    // Step 1. Got to Shop single-type
    await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
    // Step 2. Choose the product carousel component and open its toggle
    await page.getByRole('button', { name: 'Product carousel' }).click();
    // Step 3. Select a product
    await page.getByRole('combobox', { name: 'products' }).click();
    // Step 4. Open the relation modal
    await page.getByRole('option', { name: 'Create a relation' }).click();
    await expect(page.getByText('Create a relation')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();

    // Change the name of the article
    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Nike Zoom Kd Iv Gold C800');

    // Step 5. Save the related document as draft
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await expect(name).toHaveValue('Nike Zoom Kd Iv Gold C800');
    await expect(page.getByRole('status', { name: 'Draft' }).first()).toBeVisible();

    // Step 6. Close the relation modal to see the updated relation on the root document
    await page.getByRole('button', { name: 'Close modal' }).click();
    await expect(page.getByRole('button', { name: 'Nike Zoom Kd Iv Gold C800' })).toBeVisible();
  });

  test('I want to create a relation inside a new component, and save', async ({ page }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    // Step 1. Got to Shop single-type
    await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
    // Step 2. Add a new component
    await clickAndWait(page, page.getByRole('button', { name: 'Add a component to content' }));
    await clickAndWait(page, page.getByRole('button', { name: 'Product carousel', exact: true }));

    // Step 3. Choose the new product carousel component and open its toggle
    await page.getByRole('button', { name: 'Product carousel', exact: true }).click();
    // Step 4. Select a product
    await page.getByRole('combobox', { name: 'products' }).click();
    // Step 5. Open the relation modal
    await page.getByRole('option', { name: 'Create a relation' }).click();
    await expect(page.getByText('Create a relation')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();

    // Change the name of the article
    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Nike Zoom Kd Iv Gold C800');

    // Step 6. Save the related document as draft
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await expect(name).toHaveValue('Nike Zoom Kd Iv Gold C800');
    await expect(page.getByRole('status', { name: 'Draft' }).first()).toBeVisible();

    // Step 7. Close the relation modal to see the updated relation on the root document
    await page.getByRole('button', { name: 'Close modal' }).click();
    await expect(page.getByRole('button', { name: 'Nike Zoom Kd Iv Gold C800' })).toBeVisible();
  });
});
