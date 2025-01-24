import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';

test.describe('List View', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('A user should be able to navigate to the ListView of the content manager and see some entries', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Content Manager' }).click();

    await expect(page).toHaveTitle('Article | Strapi');
    await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Create new entry/ }).first()).toBeVisible();
  });

  test('Entries should be paginated', async ({ page }) => {
    // Go to the authors list view, all three entries should be visible
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Author' }).click();
    await expect(page.getByRole('gridcell', { name: 'Draft' })).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Next page' })).not.toBeVisible();

    // Lower the page size to 2 to force pagination since there are 3 entries
    const currentUrl = page.url();
    const newUrl = new URL(currentUrl);
    newUrl.searchParams.set('pageSize', '2');
    await page.goto(newUrl.toString());

    // Check that that the first page has the right content
    await expect(page.getByRole('gridcell', { name: 'Draft' })).toHaveCount(2);
    await expect(page.getByRole('gridcell', { name: 'Coach Beard' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Ted Lasso' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Previous page' })).toBeDisabled();
    await page.getByRole('link', { name: 'Next page' }).click();

    // Check that the second page has the right content
    await expect(page.getByRole('gridcell', { name: 'Draft' })).toHaveCount(1);
    await expect(page.getByRole('gridcell', { name: 'Ted Lasso' })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Coach Beard' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Next page' })).toBeDisabled();
  });

  test('A user should be able to perform bulk actions on entries', async ({ page }) => {
    await test.step('bulk publish', async () => {
      await page.getByRole('link', { name: 'Content Manager' }).click();
      // Select all entries to publish
      await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
      const items = page.getByRole('gridcell', { name: 'Draft' });
      await expect(items).toHaveCount(2);
      const checkbox = page.getByRole('checkbox', { name: 'Select all entries' });
      await checkbox.check();
      const publishButton = page.getByRole('button', { name: 'Publish' }).first();
      await publishButton.click();

      await page.waitForSelector('text=Ready to publish');

      await expect(
        page.getByRole('gridcell', {
          name: 'Already published 0',
        })
      ).toBeVisible();
      await expect(
        page.getByRole('gridcell', {
          name: 'Ready to publish 2',
        })
      ).toBeVisible();
      await expect(
        page.getByRole('gridcell', {
          name: 'Waiting for action 0',
        })
      ).toBeVisible();
      await expect(
        page.getByRole('gridcell', {
          name: 'Ready to publish changes 0',
        })
      ).toBeVisible();

      const entry1 = page
        .getByLabel('Publish entries')
        .getByRole('row', { name: 'West Ham post match analysis' })
        .getByLabel('Select');
      const entry2 = page
        .getByLabel('Publish entries')
        .getByRole('row', { name: 'Why I prefer football over soccer' })
        .getByLabel('Select');

      await expect(entry1).toBeChecked();
      await expect(entry2).toBeChecked();

      const selectAll = page
        .getByLabel('Publish entries')
        .getByRole('checkbox', { name: 'Select all entries' });
      await selectAll.uncheck();

      await expect(
        page.getByRole('gridcell', {
          name: 'Already published 0',
        })
      ).toBeVisible();
      await expect(
        page.getByRole('gridcell', {
          name: 'Ready to publish 0',
        })
      ).toBeVisible();
      await expect(
        page.getByRole('gridcell', {
          name: 'Waiting for action 0',
        })
      ).toBeVisible();
      await expect(
        page.getByRole('gridcell', {
          name: 'Ready to publish changes 0',
        })
      ).toBeVisible();

      // Check if the publish button is disabled
      const publishModalButton = page
        .getByLabel('Publish entries')
        .getByRole('button', { name: 'Publish' });
      expect(await publishModalButton.isDisabled()).toBeTruthy();

      // Select all entries to publish
      await selectAll.check();
      await publishModalButton.click();

      // Wait for the confirmation dialog to appear
      await page.waitForSelector('text=Are you sure you want to publish these entries?');

      const confirmPublishButton = page
        .getByLabel('Confirm')
        .getByRole('button', { name: 'Publish' });
      await confirmPublishButton.click();

      await expect(page.getByRole('gridcell', { name: 'published' })).toHaveCount(2);
    });

    await test.step('bulk unpublish', async () => {
      await page.getByRole('link', { name: 'Content Manager' }).click();

      await expect(page).toHaveTitle('Article | Strapi');
      await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
      const items = page.getByRole('gridcell', { name: 'published' });
      await expect(items).toHaveCount(2);
      const checkbox = page.getByRole('checkbox', { name: 'Select all entries' });

      // Select all entries to unpublish
      await checkbox.check();
      const unpublish = page.getByRole('button', { name: 'Unpublish' });
      await unpublish.click();

      // Wait for the confirmation dialog to appear
      await page.waitForSelector('text=Are you sure you want to unpublish these entries?');
      const unpublishButton = page.getByLabel('Confirm').getByRole('button', { name: 'Confirm' });
      await unpublishButton.click();

      await expect(page.getByRole('gridcell', { name: 'draft' })).toHaveCount(2);
    });

    await test.step('bulk delete', async () => {
      // Select all entries to delete
      await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
      const checkbox = page.getByRole('checkbox', { name: 'Select all entries' });
      await checkbox.check();
      const deleteButton = page.getByRole('button', { name: 'Delete', exact: true });
      await deleteButton.click();

      // Wait for the selected entries modal to appear
      await page.waitForSelector('text=Are you sure you want to delete these entries?');
      const confirmDeleteButton = page
        .getByLabel('Confirm')
        .getByRole('button', { name: 'Confirm' });
      await confirmDeleteButton.click();

      await page.waitForSelector('text=No content found');
    });
  });
});
