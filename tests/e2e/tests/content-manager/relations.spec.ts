import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { clickAndWait } from '../../utils/shared';

const AUTHOR_EDIT_URL =
  /\/admin\/content-manager\/collection-types\/api::author.author\/(?!create)[^/]/;

test.describe('Unstable Relations on the fly', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('I want to edit an existing relation in a modal and save and publish the related document', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();

    // Open the relation modal
    await clickAndWait(page, page.getByRole('button', { name: 'Coach Beard' }));
    await expect(page.getByText('Edit a relation')).toBeVisible();

    // Confirm the relation is initialized with correct data
    const name = page.getByRole('textbox', { name: 'name' });
    await expect(name).toHaveValue('Coach Beard');

    // Save the related document as draft
    await name.fill('Mr. Coach Beard');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await expect(name).toHaveValue('Mr. Coach Beard');
    await expect(page.getByRole('status', { name: 'Draft' }).first()).toBeVisible();

    // Publish the related document
    await clickAndWait(page, page.getByRole('button', { name: 'Publish' }));
    await expect(name).toHaveValue('Mr. Coach Beard');
    await expect(page.getByRole('status', { name: 'Published' }).first()).toBeVisible();

    // Close the relation modal to see the updated relation on the root document
    await page.getByRole('button', { name: 'Close modal' }).click();
    await expect(page.getByRole('button', { name: 'Mr. Coach Beard' })).toBeVisible();
  });

  test('I want to edit an existing relation in a modal and open it in full page', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();

    // Open the relation modal
    await clickAndWait(page, page.getByRole('button', { name: 'Coach Beard' }));
    await expect(page.getByText('Edit a relation')).toBeVisible();

    // click on the full page icon
    await clickAndWait(page, page.getByRole('button', { name: 'Go to entry' }));
    await page.waitForURL(AUTHOR_EDIT_URL);
    await expect(page.getByRole('heading', { name: 'Coach Beard' })).toBeVisible();
  });

  test('I want to open some nested relations and click the back button to open the initial relation', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await clickAndWait(page, page.getByRole('button', { name: 'Coach Beard' }));
    await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();

    // Open a nested relation
    await clickAndWait(page, page.getByRole('button', { name: 'West Ham post match analysis' }));
    await expect(page.getByRole('button', { name: 'Back' })).toBeEnabled();
    // and another nested relation
    await clickAndWait(page, page.getByRole('button', { name: 'Coach Beard' }));
    await expect(page.getByRole('button', { name: 'Back' })).toBeEnabled();

    // click on the Back button once
    await clickAndWait(page, page.getByRole('button', { name: 'Back' }));
    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back' })).toBeEnabled();

    // click on the Back button again
    await clickAndWait(page, page.getByRole('button', { name: 'Back' }));
    await expect(page.getByRole('heading', { name: 'Coach Beard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  test('I want to click on a nested relation in the relation modal without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await clickAndWait(page, page.getByRole('button', { name: 'Coach Beard' }));

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Beard');

    // Open the nested relation
    await clickAndWait(page, page.getByRole('button', { name: 'West Ham post match analysis' }));

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    // Check the nested relation modal is shown
    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();
  });

  test('I want to click to close the relation modal without saving the data in the form', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Open the relation modal
    await clickAndWait(page, page.getByRole('button', { name: 'Coach Beard' }));

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Beard');

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
    await clickAndWait(page, page.getByRole('button', { name: 'Coach Beard' }));

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Beard');

    // click on the full page icon
    await clickAndWait(page, page.getByRole('button', { name: 'Go to entry' }));

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    await page.waitForURL(AUTHOR_EDIT_URL);
    await expect(page.getByRole('heading', { name: 'Coach Beard' })).toBeVisible();
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
    // and another nested relation
    await clickAndWait(page, page.getByRole('button', { name: 'Coach Beard' }));

    // Change the name of the author
    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill('Mr. Coach Beard');

    // click on the Back button
    await clickAndWait(page, page.getByRole('button', { name: 'Back' }));

    // Check the confirmation modal is shown and click confirm
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));

    await expect(page.getByRole('heading', { name: 'West Ham post match analysis' })).toBeVisible();
  });

  test('I want to open a relation inside a dynamic zone component, update its content, and save', async ({
    page,
  }) => {
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    // Step 1. Got to Shop single-type
    await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
    // Step 2. Choose the product carousel component and open its toggle
    await page.getByRole('button', { name: 'Product carousel' }).click();
    // Step 3. Select a product
    await page.getByRole('combobox', { name: 'products' }).click();
    await page.getByRole('option', { name: 'Nike Mens 23/24 Away Stadium Jersey' }).click();
    // Step 4. Open the relation modal
    await page.getByRole('button', { name: 'Nike Mens 23/24 Away Stadium Jersey' }).click();
    await expect(page.getByText('Edit a relation')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Nike Mens 23/24 Away Stadium Jersey' })
    ).toBeVisible();
  });
});
