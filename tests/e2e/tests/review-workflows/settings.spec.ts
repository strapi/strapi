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

  test('as a user I want to be able to edit an existing workflow', async ({ page }) => {
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Review Workflows' }).click();

    // Click on the existing workflow
    await page.getByRole('link', { name: 'Default' }).click();

    // Edit workflow name
    await page.getByRole('textbox', { name: 'Workflow Name' }).fill('Updated Workflow');

    // Add a new stage
    await page.getByRole('button', { name: 'Add new stage' }).click();
    await page
      .getByRole('region', { name: '', exact: true })
      .getByLabel('Stage name*')
      .fill('New Stage');
    await page.getByRole('region', { name: 'New Stage' }).getByLabel('Color').click();
    await page.getByRole('option', { name: 'Yellow', exact: true }).click();

    // Save changes
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Updated Workflow');

    // Verify changes
    await expect(page.getByRole('heading', { name: 'Updated Workflow' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'New Stage' })).toBeVisible();
  });

  test('as a user I want to be able to set a required stage for publishing', async ({ page }) => {
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Review Workflows' }).click();
    await page.getByRole('link', { name: 'Create new workflow' }).click();

    /**
     * Create the dummy workflow
     */
    await page.getByRole('textbox', { name: 'Workflow Name' }).fill('Publish Workflow');
    await page.getByRole('combobox', { name: 'Associated to' }).click();
    await page.getByRole('option', { name: 'Author' }).click();
    await page.keyboard.press('Escape');

    for (const stage of [
      { name: 'Draft', color: 'Blue' },
      { name: 'Review', color: 'Lilac' },
      { name: 'Done', color: 'Green' },
    ]) {
      await page.getByRole('button', { name: 'Add new stage' }).click();
      await page
        .getByRole('region', { name: '', exact: true })
        .getByLabel('Stage name*')
        .fill(stage.name);
      await page.getByRole('region', { name: stage.name }).getByLabel('Color').click();
      await page.getByRole('option', { name: stage.color, exact: true }).click();
    }

    // Set a stage as required for publishing
    await page.getByRole('combobox', { name: 'Required stage for publishing' }).click();
    await page.getByRole('option', { name: 'Done' }).click();

    // Save workflow
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Created workflow');

    // Verify changes
    const requiredStageCombobox = page.getByRole('combobox', {
      name: 'Required stage for publishing',
    });
    await expect(requiredStageCombobox).toBeVisible();
    await expect(requiredStageCombobox.locator('span').first()).toHaveText('Done');

    // Navigate to Content Manager to check validation is working
    await page.getByRole('link', { name: 'Content Manager' }).click();

    // Go to the entry
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Author' }).click();
    await page.getByRole('gridcell', { name: 'Ted Lasso' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Ted Laso');

    // Try to publish without reaching the required stage
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Entry is not at the required stage to publish')).toBeVisible();

    // Change the stage to the required one & publish
    await page.getByRole('combobox', { name: 'Review stage' }).click();
    await page.getByRole('option', { name: 'Done' }).click();
    await findAndClose(page, 'Review stage updated');

    await page.getByRole('button', { name: 'Publish' }).click();

    await expect(page.getByText('Published document')).toBeVisible();
  });
});
