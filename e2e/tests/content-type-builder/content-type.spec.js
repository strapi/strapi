import { test, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';
import { login } from '../../utils/login';
import {
  addDefaultField,
  createContentType,
  deleteContentType,
  verifyFieldPresence,
  waitForReload,
} from '../../utils/content-type-builder';

// all tests are run for single and collection types, because there
// is no difference in creating them
async function main() {
  for (const type of ['collection type', 'single type']) {
    await test.describe(`Content Type Builder | Content-Type | ${type}`, () => {
      test.beforeEach(async ({ page }) => {
        await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
        await page.goto('/admin');
        await login({ page });
        await page.getByRole('link', { name: 'Content-Type Builder' }).click();
      });

      test('A user should be able to create a content type using simple fields', async ({
        page,
      }) => {
        await createContentType({ page, type, displayName: `CT ${type}` });
        await addDefaultField({ page, type: 'Text', name: 'textField' });
        // TODO: add each field-type

        await page.getByRole('button', { name: 'Save' }).click();
        await waitForReload({ page });

        // Verify the content-type has been created
        await expect(page.getByRole('heading', { name: `CT ${type}` })).toBeVisible();

        // Verify the content-type contains the field(s)
        await verifyFieldPresence({ page, name: 'textField' });

        // Cleanup
        await deleteContentType({ page, displayName: `CT ${type}` });
      });

      // TODO
      // test('A user should be able to customize the API ID of a field', async ({ page }) => {});
    });
  }
}

main();
