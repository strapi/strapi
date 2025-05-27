import { test, expect } from '@playwright/test';

import { EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD } from '../../constants';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';
import { clickAndWait, findAndClose, navToHeader } from '../../utils/shared';
import { waitForRestart } from '../../utils/restart';
import { resetFiles } from '../../utils/file-reset';

test.describe('Locale Permissions', () => {
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test("As a user I should not be able to create a document in a locale I don't have permissions for", async ({
    page,
  }) => {
    /**
     * Navigate to settings and roles & modify editor permissions
     */
    await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
    await expect(page.getByRole('gridcell', { name: 'Editor', exact: true })).toBeVisible();
    await page.getByRole('gridcell', { name: 'Editor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Edit a role' })).toBeVisible();

    /**
     * Set permissions for English (en) locale
     */
    await clickAndWait(page, page.getByRole('button', { name: 'Article' }));
    await page.getByLabel('Select all English (en)').check();

    /**
     * Set permissions for French (fr) locale. Editors can now do everything BUT
     * create french content
     */
    await page.getByLabel('Select all French (fr)').check();
    await page.getByLabel('Select fr Create permission').uncheck();

    // Scroll to the top of the page before clicking save
    // TODO: Fix the need to scroll to the top before saving. z-index of layout
    // header is behind the permissions component.
    await page.evaluate(() => window.scrollTo(0, 0));
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Success:Saved');

    /**
     * Logout and login as editor
     */
    await clickAndWait(page, page.getByRole('button', { name: 'tt test testing' }));
    await page.getByRole('menuitem', { name: /^Log(?:out| out)$/i }).click();
    await page.waitForURL('/admin/auth/login');

    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });

    /**
     * Verify permissions
     */
    await navToHeader(page, ['Content Manager'], 'Content Manager');
    await expect(page.getByText('English (en)', { exact: true })).toBeVisible();

    /**
     * Verify we can create a new entry in the english locale as expected
     */
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }));
    await page.getByLabel('title').fill('the richmond way');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Success:Saved');

    /**
     * Verify we cannot create a new entry in the french locale as editors do
     * not have the right permissions
     */
    await page.getByLabel('Locales').click();
    await expect(page.getByLabel('Create French (fr) locale')).toBeDisabled();
  });

  test('As a user I should be able to delete a locale of a single type and collection type', async ({
    page,
  }) => {
    /**
     * Navigate to our articles list-view and create a new entry
     */
    await navToHeader(page, ['Content Manager'], 'Content Manager');
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }));
    await page.getByLabel('title').fill('trent crimm');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Success:Saved');

    /**
     * Create a Spanish (es) locale for the entry
     */
    await page.getByLabel('Locales').click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await page.getByLabel('title').fill('dani rojas');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Success:Saved');

    /**
     * Delete the Spanish (es) locale entry
     */
    await clickAndWait(page, page.getByRole('button', { name: 'More actions' }));
    await clickAndWait(page, page.getByRole('menuitem', { name: 'Delete entry (Spanish (es))' }));
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));
    await findAndClose(page, 'Success:Deleted');

    /**
     * Navigate to our homepage single-type and create a new entry
     */
    await navToHeader(page, ['Content Manager', 'Homepage'], 'Homepage');
    await page.getByLabel('title').fill('football is life');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Success:Saved');

    /**
     * Create a Spanish (es) locale for the homepage entry
     */
    await page.getByLabel('Locales').click();
    await page.getByRole('option', { name: 'Spanish (es)' }).click();
    await page.getByLabel('title').fill('el fútbol también es muerte.');
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Success:Saved');

    /**
     * Delete the Spanish (es) locale homepage entry
     */
    await clickAndWait(page, page.getByRole('button', { name: 'More actions' }));
    await clickAndWait(page, page.getByRole('menuitem', { name: 'Delete entry (Spanish (es))' }));
    await clickAndWait(page, page.getByRole('button', { name: 'Confirm' }));
    await findAndClose(page, 'Success:Deleted');
  });
});
