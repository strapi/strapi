import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { describeOnCondition, findAndClose } from '../../utils/shared';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('settings', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('as a user I want to be able to create a new workflow with three stages', async ({
    page,
  }) => {
    /**
     * Get to the settings page
     */
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Review Workflows' }).click();

    await page.getByRole('link', { name: 'Create new workflow' }).click();

    /**
     * Create the dummy workflow
     */
    await page.getByRole('textbox', { name: 'Workflow Name' }).fill('Articles');
    await page.getByRole('combobox', { name: 'Associated to' }).click();
    await page.getByRole('option', { name: 'Author' }).click();
    await page.keyboard.press('Escape');

    for (const stage of [
      { name: 'Draft', color: 'Blue' },
      { name: 'Review', color: 'Lilac' },
      { name: 'Published', color: 'Green' },
    ]) {
      await page.getByRole('button', { name: 'Add new stage' }).click();
      await page
        .getByRole('region', { name: '', exact: true })
        .getByLabel('Stage name*')
        .fill(stage.name);
      await page.getByRole('region', { name: stage.name }).getByLabel('Color').click();
      await page.getByRole('option', { name: stage.color, exact: true }).click();
    }

    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Created workflow');

    /**
     * Now navigate and validate we have the updated details
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Author' }).click();
    await page.getByRole('gridcell', { name: 'Ted Lasso' }).click();

    /**
     * Assert the workflows panel is visible and we're using the correct workflow
     */
    await expect(page.getByRole('heading', { name: 'REVIEW WORKFLOWS' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Assignee' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Review stage' })).toBeVisible();

    await page.getByRole('combobox', { name: 'Review stage' }).click();

    for (const stage of ['Review', 'Published']) {
      await expect(page.getByRole('option', { name: stage })).toBeVisible();
    }
  });
});
