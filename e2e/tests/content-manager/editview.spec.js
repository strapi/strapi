import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';

test.describe('Edit View', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  /**
   * @note There is only one field in this content-type.
   */
  test('A user should be able to navigate to the EditView of the content manager to create, save, publish, unpublish & delete a new entry', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page
      .getByRole('link', { name: /Create new entry/ })
      .nth(1)
      .click();

    /**
     * Now we're in the edit view.
     */
    await page.waitForURL('**/content-manager/collection-types/api::testing.testing/create');

    await page.getByRole('textbox', { name: 'title' }).fill('my content');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Saved')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

    await page.getByRole('button', { name: 'Publish' }).click();

    await expect(page.getByText('Published', { exact: true })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Unpublish' })).not.toBeDisabled();

    await page.getByRole('textbox', { name: 'title' }).fill('my content revised');

    await expect(page.getByRole('button', { name: 'Unpublish' })).toBeDisabled();

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('button', { name: 'Unpublish' })).not.toBeDisabled();

    await page.getByRole('button', { name: 'Unpublish' }).click();

    await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();

    await page.getByRole('button', { name: 'Yes, confirm' }).click();

    await expect(page.getByText('Unpublished')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();

    await page.getByRole('button', { name: 'Delete this entry' }).click();

    await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();

    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText('Deleted')).toBeVisible();

    /**
     * We're back on the list view
     */
    await page.waitForURL(
      '**/content-manager/collection-types/api::testing.testing?page=1&pageSize=10&sort=title:ASC'
    );

    await expect(page.getByRole('link', { name: /Create new entry/ }).nth(1)).toBeVisible();
  });
});
