import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { describeOnCondition, findAndClose } from '../../utils/shared';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('content-manager', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('as a user I want to assign a document to a user and see this update in the list-view afterwards', async ({
    page,
  }) => {
    /**
     * Navigate to content-type
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('gridcell', { name: 'West Ham post match analysis' }).click();

    /**
     * Check the assignee combobox exists and set the assignee to our editor
     */
    await expect(page.getByRole('combobox', { name: 'Assignee' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Assignee' }).click();
    await page.getByRole('option', { name: 'editor testing' }).click();

    await findAndClose(page, 'Assignee updated');

    /**
     * Double check it's updated correctly, this would fail if
     * the document is not updated with the assignee as we
     * refetch said document.
     */
    await expect(page.getByRole('combobox', { name: 'Assignee' })).toHaveValue('editor testing');

    /**
     * Go back to ensure the list view has correctly updated
     */
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page.getByRole('gridcell', { name: 'editor testing' })).toBeVisible();

    /**
     * Finally, go back to our content-type to assert that it did indeed update
     */
    await page.getByRole('gridcell', { name: 'West Ham post match analysis' }).click();
    await expect(page.getByRole('combobox', { name: 'Assignee' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Assignee' })).toHaveValue('editor testing');
  });

  test('as a user I want to change the stage of a document and see this update in the list-view afterwards', async ({
    page,
  }) => {
    /**
     * Navigate to content-type
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('gridcell', { name: 'West Ham post match analysis' }).click();

    /**
     * Check the stage combobox exists and set the stage to in progress
     */
    await expect(page.getByRole('combobox', { name: 'Review stage' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Review stage' }).click();
    await page.getByRole('option', { name: 'In progress' }).click();

    await findAndClose(page, 'Review stage updated');

    /**
     * Double check it's updated correctly, this would fail if
     * the document is not updated with the stage as we
     * refetch said document.
     */
    await expect(page.getByRole('combobox', { name: 'Review stage' })).toHaveText('In progress');

    /**
     * Go back to ensure the list view has correctly updated
     */
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page.getByRole('gridcell', { name: 'In progress' })).toBeVisible();

    /**
     * Finally, go back to our content-type to assert that it did indeed update
     */
    await page.getByRole('gridcell', { name: 'West Ham post match analysis' }).click();
    await expect(page.getByRole('combobox', { name: 'Review stage' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Review stage' })).toHaveText('In progress');
  });
});
