import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { findAndClose, navToHeader } from '../../utils/shared';

test.describe('Cloning', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('As a user I want to auto-clone a document', async ({ page }) => {
    /**
     * A document can be auto-cloned if it does not have unique fields
     * or specific relation types that prevents it from being cloned.
     */
    const EDIT_URL = /\/admin\/content-manager\/collection-types\/api::author.author\/[^/]+(\?.*)?/;
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::author.author(\?.*)?/;

    /**
     * Get to the list view of our articles,
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Author' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('row', { name: 'Coach Beard' })).toBeVisible();
    expect(await page.getByRole('row', { name: 'Coach Beard' }).all()).toHaveLength(1);

    /**
     * Open the row actions menu and click on the duplicate button.
     */
    await expect(page.getByRole('button', { name: 'Row actions' }).first()).toBeEnabled();
    await page.getByRole('button', { name: 'Row actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await findAndClose(page, 'Success:Cloned document');

    /**
     * Now we should be in our edit view with the new document already saved.
     * The save button should be disabled and the publish button enabled.
     */
    await page.waitForURL(EDIT_URL);
    await expect(page.getByRole('heading', { name: 'Coach Beard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled();

    /**
     * Now to assert it was correctly cloned we can go back to the list view and check
     * if the new document is there.
     */
    await page.getByRole('link', { name: 'Author' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('heading', { name: 'Author' })).toBeVisible();
    expect(await page.getByRole('row', { name: 'Coach Beard' }).all()).toHaveLength(2);
  });

  test('As a user I want to clone an entry with relations from the list-view', async ({ page }) => {
    const CLONE_URL =
      /\/admin\/content-manager\/collection-types\/api::article.article\/clone\/[^/]+(\?.*)?/;
    const EDIT_URL =
      /\/admin\/content-manager\/collection-types\/api::article.article\/[^/]+(\?.*)?/;
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;

    /**
     * Get to the list view of our articles,
     */
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await expect(page.getByRole('row', { name: 'West ham post match analysis' })).toBeVisible();
    expect(
      await page.getByRole('row', { name: 'West ham post match analysis' }).all()
    ).toHaveLength(1);

    /**
     * Open the row actions menu and click on the duplicate button.
     */
    await expect(page.getByRole('button', { name: 'Row actions' }).first()).toBeEnabled();
    await page.getByRole('button', { name: 'Row actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();

    /**
     * This wil fail because the author document type has a UID for its slug.
     */
    await expect(page.getByText(/This entry can't be duplicated directly./)).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Duplicate' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Duplicate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create', exact: true })).toBeVisible();
    await expect(page.getByLabel('Duplicate').getByText('slug')).toBeVisible();
    await page.getByRole('link', { name: 'Create', exact: true }).click();

    /**
     * Now we should be in our edit view with the new document already saved.
     * The save button should be disabled and the publish button enabled.
     */
    await page.waitForURL(CLONE_URL);
    await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled(); // we current don't support publish & create in clone routes.
    await page.getByRole('textbox', { name: 'slug' }).fill('');
    await page.getByRole('textbox', { name: 'slug' }).fill('hammers-post-match-analysis');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Success:Cloned document');
    await page.waitForURL(EDIT_URL);

    /**
     * Now to assert it was correctly cloned we can go back to the list view and check
     * if the new document is there.
     */
    await page.getByRole('link', { name: 'Article' }).click();
    await page.waitForURL(LIST_URL);
    await expect(page.getByRole('grid')).toBeVisible();
    expect(
      await page.getByRole('row', { name: 'West ham post match analysis' }).all()
    ).toHaveLength(2);
  });
});
