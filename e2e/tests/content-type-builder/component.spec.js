import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';
import { login } from '../../utils/login';
import {
  addDefaultField,
  createComponent,
  deleteComponent,
  verifyFieldPresence,
  waitForReload,
} from '../../utils/content-type-builder';

test.describe('Content Type Builder | Components', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
    await page.goto('/admin');
    await login({ page });
    await page.getByRole('link', { name: 'Content-Type Builder' }).click();
  });

  test('A user should be able to create a component using a new category', async ({ page }) => {
    await createComponent({ page, displayName: 'My component', category: 'new-category' });
    await addDefaultField({ page, type: 'Text', name: 'textField' });

    await page.getByRole('button', { name: 'Save' }).click();

    await waitForReload({ page });

    // Verify the component has been created
    await expect(page.getByRole('heading', { name: 'My component' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'new-category' })).toBeVisible();

    // Verify the component contains the field(s)
    await verifyFieldPresence({ page, name: 'textField' });

    // Cleanup
    await deleteComponent({ page, displayName: 'My component' });
  });

  test('A user should be able to create a component using an existing category', async ({
    page,
  }) => {
    await createComponent({ page, displayName: 'My component', category: 'new-category' });
    await addDefaultField({ page, type: 'Text', name: 'textField' });

    await page.getByRole('button', { name: 'Save' }).click();
    await waitForReload({ page });

    await createComponent({
      page,
      displayName: 'My second component',
      existingCategory: 'new-category',
    });
    await addDefaultField({ page, type: 'Text', name: 'textField' });

    await page.getByRole('button', { name: 'Save' }).click();
    await waitForReload({ page });

    // Verify the component has been created
    await expect(page.getByRole('heading', { name: 'My second component' })).toBeVisible();

    // Verify the component has the category
    // await page.getByRole('button', { name: 'Edit' }).click();
    // TODO: currently this can't be tested, because the category is not displayed as value
    // of the select, which is most certianly a bug

    // Verify the component contains the field(s)
    await verifyFieldPresence({ page, name: 'textField' });

    // Cleanup
    await deleteComponent({ page, displayName: 'My component' });
    await deleteComponent({ page, displayName: 'My second component' });
  });
});
