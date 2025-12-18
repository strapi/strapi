import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { clickAndWait } from '../../../../utils/shared';

test.describe('Relations on the fly - Create a Relation inside a new component and Save', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
  });

  test('I want to create a relation inside a new component, and save', async ({ page }) => {
    // Step 0. Login as admin
    await login({ page });
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    // Step 1. Got to Shop single-type
    await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
    // Step 2. Add a new component
    await clickAndWait(page, page.getByRole('button', { name: 'Add a component to content' }));
    // Step 3. Choose the new product carousel component and open its toggle
    await clickAndWait(page, page.getByRole('button', { name: 'Product carousel' }).first());

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
    await expect(page.getByText('Edit a relation')).toBeVisible();
    await clickAndWait(page, page.getByRole('button', { name: 'Close modal' }));

    // Wait for the button to be visible with a more specific selector
    await expect(page.getByRole('button', { name: 'Nike Zoom Kd Iv Gold C800' })).toBeVisible();
  });
});
