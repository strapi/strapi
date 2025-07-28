import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { clickAndWait } from '../../../utils/shared';

test.describe('Relations on the fly - Create a Relation inside a component and Save', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
  });

  test('I want to create a relation inside a component, and save', async ({ page }) => {
    // Step 0. Login as admin
    await login({ page });
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    // Step 1. Got to Shop single-type
    await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
    // Step 2. Choose the product carousel component and open its toggle
    await page.getByRole('button', { name: 'Product carousel', exact: true }).click();
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
    const closeButton = page.getByRole('button', { name: 'Close modal' });
    await closeButton.click();

    // Wait for the modal to be closed
    await expect(page.getByText('Create a relation')).not.toBeVisible();

    // Wait for the button to be visible with a more specific selector
    await expect(page.getByRole('button', { name: 'Nike Zoom Kd Iv Gold C800' })).toBeVisible();
  });
});
