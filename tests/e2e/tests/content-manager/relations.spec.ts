import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { clickAndWait, describeOnCondition, findAndClose } from '../../utils/shared';

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
  });
});
