import { test, expect } from '@playwright/test';
import { waitForRestart } from '../../../../utils/restart';
import { resetFiles } from '../../../../utils/file-reset';
import { navToHeader } from '../../../../utils/shared';
import { sharedSetup } from '../../../../utils/setup';

/**
 * This test demonstrates the field rename data loss bug.
 * 
 * Issue: When a collection field is renamed in the Content-Type Builder,
 * existing data in that field disappears from the Entry Detail view.
 * 
 * Root Cause: The backend treats field renaming as delete+create instead of
 * performing an actual database column rename, causing the frontend to filter
 * out the old column data that doesn't match the new schema.
 */
test.describe('Field rename data preservation', () => {
  test.describe.configure({ timeout: 500000 });

  const ctName = 'Article';
  const originalFieldName = 'title';
  const renamedFieldName = 'articleTitle';
  const testData = 'Test Article Title';

  test.beforeEach(async ({ page }) => {
    await resetFiles();
    await sharedSetup('ctb-field-rename', page, {
      importData: 'with-admin.tar',
      login: true,
      resetFiles: true,
    });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('Should preserve data when renaming a field', async ({ page }) => {
    // Step 1: Navigate to Content Manager and create an entry with data
    await page.goto('/admin/content-manager/collection-types/api::article.article');
    await page.getByRole('link', { name: 'Create new entry' }).click();
    
    // Fill in the title field with test data
    await page.getByLabel('title').fill(testData);
    await page.getByRole('button', { name: 'Publish' }).click();
    
    // Wait for success notification
    await expect(page.getByText(/published/i)).toBeVisible();
    
    // Get the entry ID from URL for later verification
    const currentUrl = page.url();
    const entryId = currentUrl.match(/\/(\d+)$/)?.[1];
    expect(entryId).toBeDefined();

    // Step 2: Navigate to Content-Type Builder and rename the field
    await navToHeader(page, ['Content-Type Builder', ctName], ctName);
    
    // Find and edit the title field
    await page.getByRole('button', { name: /edit title/i }).click();
    
    // Change the field name
    await page.getByLabel('Name').fill(renamedFieldName);
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    
    // Wait for server restart
    await waitForRestart(page);
    
    // Step 3: Navigate back to the entry and verify data is still present
    await page.goto(`/admin/content-manager/collection-types/api::article.article/${entryId}`);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // THIS IS WHERE THE BUG MANIFESTS:
    // The renamed field should contain the original data
    const renamedFieldInput = page.getByLabel(renamedFieldName);
    await expect(renamedFieldInput).toBeVisible();
    
    // BUG: This assertion FAILS because the data is lost
    // The field appears empty even though the data exists in the database
    await expect(renamedFieldInput).toHaveValue(testData);
    
    // Alternative: Check via API to confirm data exists in database
    const response = await page.request.get(
      `/api/articles/${entryId}`,
      {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('jwtToken'))}`
        }
      }
    );
    
    const data = await response.json();
    
    // The data should exist under either the old or new field name
    // Ideally it should be under the new field name after proper migration
    const fieldValue = data.data[renamedFieldName] || data.data[originalFieldName];
    expect(fieldValue).toBe(testData);
  });

  test('Should handle multiple field renames in sequence', async ({ page }) => {
    // Step 1: Create entry with data
    await page.goto('/admin/content-manager/collection-types/api::article.article');
    await page.getByRole('link', { name: 'Create new entry' }).click();
    
    await page.getByLabel('title').fill('Original Title');
    await page.getByLabel('description').fill('Original Description');
    await page.getByRole('button', { name: 'Publish' }).click();
    
    await expect(page.getByText(/published/i)).toBeVisible();
    const entryId = page.url().match(/\/(\d+)$/)?.[1];

    // Step 2: Rename first field
    await navToHeader(page, ['Content-Type Builder', ctName], ctName);
    await page.getByRole('button', { name: /edit title/i }).click();
    await page.getByLabel('Name').fill('heading');
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);

    // Step 3: Rename second field
    await navToHeader(page, ['Content-Type Builder', ctName], ctName);
    await page.getByRole('button', { name: /edit description/i }).click();
    await page.getByLabel('Name').fill('summary');
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);

    // Step 4: Verify both fields retained their data
    await page.goto(`/admin/content-manager/collection-types/api::article.article/${entryId}`);
    await page.waitForLoadState('networkidle');

    // Both renamed fields should have their original data
    await expect(page.getByLabel('heading')).toHaveValue('Original Title');
    await expect(page.getByLabel('summary')).toHaveValue('Original Description');
  });

  test('Should preserve data when renaming field in a component', async ({ page }) => {
    // This test ensures the bug fix also works for fields within components
    
    // TODO: Implement after basic field rename is fixed
    // 1. Create a content type with a component
    // 2. Add data to component fields
    // 3. Rename a field within the component
    // 4. Verify data is preserved
    test.skip();
  });
});
