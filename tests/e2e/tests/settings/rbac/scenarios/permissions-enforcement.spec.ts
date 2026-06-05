import { test, expect } from '@playwright/test';
import { login } from '../../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../../utils/dts-import';
import { clickAndWait, navToHeader, findAndClose } from '../../../../../utils/shared';
import { EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD } from '../../../../constants';

test.describe('RBAC - Permissions enforcement', { tag: ['@critical'] }, () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user without publish permission cannot publish content', async ({ page }) => {
    // Step 1: Remove publish permission from the Editor role
    await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
    await page.getByRole('gridcell', { name: 'Editor', exact: true }).click();

    await page.getByRole('tab', { name: 'Collection Types' }).click();
    await page.getByRole('checkbox', { name: 'Select Publish article' }).uncheck();

    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved');

    // Step 2: Log out as admin
    await page.getByRole('button', { name: 'test testing' }).click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();

    // Step 3: Log in as the Editor user
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });

    // Step 4: Navigate to an article
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Step 5: Assert the Publish button is disabled
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });
});
