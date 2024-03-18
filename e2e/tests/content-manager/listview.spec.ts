/**
 * THIS IS A DUMMY TEST.
 */
import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';

test.describe('List View', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
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
      const checkbox = await page.$('input[aria-label="Select all entries"]');

      // Select all entries to unpublish
      await checkbox.check();
      const unpublish = page.getByRole('button', { name: 'Unpublish' });
      await unpublish.click();

      // Wait for the confirmation dialog to appear
      const dialog = await page.$('[role="dialog"]');
      await page.waitForSelector('text=Are you sure you want to unpublish these entries?');
      const unpublishButton = await dialog.$('button:has-text("Unpublish")');
      await unpublishButton.click();

      await expect(page.getByRole('gridcell', { name: 'draft' })).toHaveCount(2);
    });

    await test.step('bulk publish', async () => {
      // Select all entries to publish
      await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
      const checkbox1 = await page.$('input[aria-label="Select all entries"]');
      await checkbox1.check();
      const publish = page.getByRole('button', { name: 'Publish' });
      await publish.click();

      // Wait for the selected entries modal to appear
      const publishModal = await page.$('[role="dialog"]');
      await page.waitForSelector(
        'text=0 entries already published. 2 entries ready to publish. 0 entries waiting for action'
      );
      const publishButton = await publishModal.$('button:has-text("Publish")');
      await publishButton.click();

      // Wait for the confirmation dialog to appear
      const confirmDialog = await page.$$('[role="dialog"]');
      await page.waitForSelector('text=Are you sure you want to publish these entries?');
      const confirmPublishButton = await confirmDialog[1].$('button:has-text("Publish")');
      await confirmPublishButton.click();

      await expect(page.getByRole('gridcell', { name: 'published' })).toHaveCount(2);
    });

    await test.step('bulk delete', async () => {
      // Select all entries to delete
      await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
      const checkbox1 = await page.$('input[aria-label="Select all entries"]');
      await checkbox1.check();
      const deleteButton = page.getByRole('button', { name: 'Delete', exact: true });
      await deleteButton.click();

      // Wait for the selected entries modal to appear
      const modal = await page.$('[role="dialog"]');
      await page.waitForSelector('text=Are you sure you want to delete these entries?');
      const confirmDeleteButton = await modal.$('button:has-text("Confirm")');
      await confirmDeleteButton.click();

      await page.waitForSelector('text=No content found');
    });
  });
});
