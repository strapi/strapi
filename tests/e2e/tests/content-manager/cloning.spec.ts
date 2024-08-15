import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { findAndClose } from '../../utils/shared';
import { waitForRestart } from '../../utils/restart';

test.describe('Cloning', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  const CREATE_URL =
    /\/admin\/content-manager\/collection-types\/api::article.article\/create(\?.*)?/;
  const LIST_URL = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;

  test('A user should not be able to clone an entry of a content type that has a clashing unique field', async ({
    page,
  }) => {
    /**
     * Set up a unique field on the article content type
     */
    await page.getByRole('link', { name: 'Content-Type Builder' }).click();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByLabel('Edit title').click();
    await page.getByRole('tab', { name: 'Advanced settings' }).click();
    await page.getByLabel('Unique field').check();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);

    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.waitForURL(LIST_URL);

    /**
     * Create a new entry with a unique field
     */
    await page.getByRole('link', { name: 'Create new entry' }).click();
    await page.getByLabel('title(This value is common to all locales)').fill('unique');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');

    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.waitForURL(LIST_URL);

    /**
     * Attempt to create a duplicate entry with the same unique field value
     */
    await page.getByLabel('Duplicate item line 3').click();
    await page.getByRole('link', { name: 'Create', exact: true }).click();
    await page.waitForURL(CREATE_URL);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('This attribute must be unique').first()).toBeVisible();

    /**
     * Update the unique field value to a new value
     */
    await page.getByLabel('title(This value is common to all locales)').fill('Unique Update');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Saved');
  });
});
