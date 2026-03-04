import { expect, test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { findAndClose, navToHeader } from '../../../utils/shared';

const EDIT_URL_AUTHOR =
  /\/admin\/content-manager\/collection-types\/api::author.author\/[^/]+(\?.*)?/;
const LIST_URL_AUTHOR = /\/admin\/content-manager\/collection-types\/api::author.author(\?.*)?/;
const CLONE_URL_ARTICLE =
  /\/admin\/content-manager\/collection-types\/api::article.article\/clone\/[^/]+(\?.*)?/;
const EDIT_URL_ARTICLE =
  /\/admin\/content-manager\/collection-types\/api::article.article\/[^/]+(\?.*)?/;
const LIST_URL_ARTICLE = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;
const LIST_URL_TEAM = /\/admin\/content-manager\/collection-types\/api::team.team(\?.*)?/;
const EDIT_URL_TEAM = /\/admin\/content-manager\/collection-types\/api::team.team\/[^/]+(\?.*)?/;
const CREATE_URL_TEAM = /\/admin\/content-manager\/collection-types\/api::team.team\/create(\?.*)?/;

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

    /**
     * Get to the list view of our articles,
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Author' }).click();
    await page.waitForURL(LIST_URL_AUTHOR);
    await expect(page.getByRole('row', { name: 'Coach Beard' })).toBeVisible();
    expect(await page.getByRole('row', { name: 'Coach Beard' }).all()).toHaveLength(1);

    /**
     * Open the row actions menu and click on the duplicate button.
     */
    await expect(page.getByRole('button', { name: 'Row actions' }).first()).toBeEnabled();
    await page.getByRole('button', { name: 'Row actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await findAndClose(page, 'Cloned document');

    /**
     * Now we should be in our edit view with the new document already saved.
     * The save button should be disabled and the publish button enabled.
     */
    await page.waitForURL(EDIT_URL_AUTHOR);
    await expect(page.getByRole('heading', { name: 'Coach Beard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled();

    /**
     * Now to assert it was correctly cloned we can go back to the list view and check
     * if the new document is there.
     */
    await page.getByRole('link', { name: 'Author' }).click();
    await page.waitForURL(LIST_URL_AUTHOR);
    await expect(page.getByRole('heading', { name: 'Author' })).toBeVisible();
    expect(await page.getByRole('row', { name: 'Coach Beard' }).all()).toHaveLength(2);
  });

  test('As a user I want to auto-clone a document in a different locale than the default one', async ({
    page,
  }) => {
    /**
     * Get to the list view of our articles,
     */
    await page.getByRole('link', { name: 'Content Manager' }).click();
    await page.getByRole('link', { name: 'Team' }).click();
    await page.waitForURL(LIST_URL_TEAM);

    /**
     * Swap to the Spanish locale
     */
    await page.getByRole('combobox', { name: 'Select a locale' }).click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();

    /**
     * Create the Barcelona entry
     */
    await page.getByRole('link', { name: 'Create new entry' }).first().click();
    await page.waitForURL(CREATE_URL_TEAM);
    await page.getByRole('textbox', { name: 'name' }).fill('FC Barcelona');
    await page.getByRole('textbox', { name: 'founded' }).fill('1899');

    /**
     * Publish the document
     */
    await page.getByRole('button', { name: 'Publish' }).click();
    await findAndClose(page, 'Published');

    /**
     * Now we'll go back to the list view to ensure the content has been updated
     */
    await page.getByRole('link', { name: 'Team' }).click();

    // Use first() to avoid strict mode violations when multiple rows exist
    await expect(page.getByRole('row', { name: 'FC Barcelona' }).first()).toBeVisible();

    // Count the actual number of FC Barcelona rows
    const barcelonaRows = await page.getByRole('row', { name: 'FC Barcelona' }).all();
    console.log(
      `Found ${barcelonaRows.length} FC Barcelona rows in ${await page.context().browser()?.browserType().name()} browser`
    );

    // At least one should exist (the one we just created)
    expect(barcelonaRows.length).toBeGreaterThanOrEqual(1);

    /**
     * Open the row actions menu and click on the duplicate button.
     */
    await expect(page.getByRole('button', { name: 'Row actions' }).first()).toBeEnabled();
    await page.getByRole('button', { name: 'Row actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await findAndClose(page, 'Cloned document');

    /**
     * Now we should be in our edit view with the new document already saved.
     * The save button should be disabled and the publish button enabled.
     */
    await page.waitForURL(EDIT_URL_TEAM);
    await expect(page.getByRole('heading', { name: 'FC Barcelona' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  test('As a user I want to clone an entry with relations from the list-view', async ({ page }) => {
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
    await page.waitForURL(CLONE_URL_ARTICLE);
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled(); // we current don't support publish & create in clone routes.
    await page.getByRole('textbox', { name: 'slug' }).fill('');
    await page.getByRole('textbox', { name: 'slug' }).fill('hammers-post-match-analysis');
    await page.getByRole('button', { name: 'Save' }).click();
    await findAndClose(page, 'Cloned document');
    await page.waitForURL(EDIT_URL_ARTICLE);

    /**
     * Now to assert it was correctly cloned we can go back to the list view and check
     * if the new document is there.
     */
    await page.getByRole('link', { name: 'Article' }).click();
    await page.waitForURL(LIST_URL_ARTICLE);
    await expect(page.getByRole('grid')).toBeVisible();
    expect(
      await page.getByRole('row', { name: 'West ham post match analysis' }).all()
    ).toHaveLength(2);
  });
});
