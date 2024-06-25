/**
 * THIS IS A DUMMY TEST.
 */
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

    await expect(page).toHaveTitle('Content Manager');
    await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Create new entry/ }).first()).toBeVisible();
  });

  test('A user should be able to perform bulk actions on entries', async ({ page }) => {
    await test.step('bulk unpublish', async () => {
      await page.getByRole('link', { name: 'Content Manager' }).click();

      await expect(page).toHaveTitle('Content Manager');
      await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
      const publishedItems = page.getByRole('gridcell', { name: 'published' });
      expect(publishedItems).toHaveCount(2);
      const checkbox = page.getByRole('checkbox', { name: 'Select all entries' });

      // Select all entries to unpublish
      await checkbox.check();
      const unpublish = page.getByRole('button', { name: 'Unpublish' });
      await unpublish.click();

      // Wait for the confirmation dialog to appear
      await page.waitForSelector('text=Are you sure you want to unpublish these entries?');
      const unpublishButton = page
        .getByLabel('Confirmation')
        .getByRole('button', { name: 'Unpublish' });
      await unpublishButton.click();

      await expect(page.getByRole('gridcell', { name: 'draft' })).toHaveCount(2);
    });

    await test.step('bulk publish', async () => {
      // Select all entries to publish
      await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
      const checkbox = page.getByRole('checkbox', { name: 'Select all entries' });
      await checkbox.check();
      const publish = page.getByRole('button', { name: 'Publish' });
      await publish.click();

      // Wait for the selected entries modal to appear
      await page.waitForSelector(
        'text=0 entries already published. 2 entries ready to publish. 0 entries waiting for action'
      );
      // All entries should be selected
      const checkboxEntry1 = page
        .getByLabel('Publish entries')
        .getByRole('checkbox', { name: 'Select 1' });
      const checkboxEntry2 = page
        .getByLabel('Publish entries')
        .getByRole('checkbox', { name: 'Select 2' });
      await expect(checkboxEntry1).toBeChecked();
      await expect(checkboxEntry2).toBeChecked();

      await checkboxEntry1.uncheck();
      await checkboxEntry2.uncheck();

      await page.waitForSelector(
        'text=0 entries already published. 0 entries ready to publish. 0 entries waiting for action'
      );

      const publishButton = page
        .getByLabel('Publish entries')
        .getByRole('button', { name: 'Publish' });
      expect(await publishButton.isDisabled()).toBeTruthy();

      // Select all entries to publish
      await checkboxEntry1.check();
      await checkboxEntry2.check();

      const publishModalButton = page
        .getByLabel('Publish entries')
        .getByRole('button', { name: 'Publish' });
      await publishModalButton.click();

      // Wait for the confirmation dialog to appear
      await page.waitForSelector('text=Are you sure you want to publish these entries?');

      const confirmPublishButton = page
        .getByLabel('Confirmation')
        .getByRole('button', { name: 'Publish' });
      await confirmPublishButton.click();

      await expect(page.getByRole('gridcell', { name: 'published' })).toHaveCount(2);
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
        .getByLabel('Confirmation')
        .getByRole('button', { name: 'Confirm' });
      await confirmDeleteButton.click();

      await page.waitForSelector('text=No content found');
    });
  });
});
