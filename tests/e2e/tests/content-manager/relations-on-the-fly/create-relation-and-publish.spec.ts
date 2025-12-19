import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { clickAndWait } from '../../../../utils/shared';

test.describe('Relations on the fly - Create a Relation and Save', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
  });

  test('I want to create a new relation, publish the related document and check if the new relation is added to the parent document', async ({
    page,
  }) => {
    // Step 0. Login as admin
    await login({ page });
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
});
