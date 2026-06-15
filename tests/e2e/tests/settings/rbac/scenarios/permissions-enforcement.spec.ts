import { test, expect } from '@playwright/test';
import { login } from '../../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../../utils/dts-import';
import { clickAndWait, navToHeader, findAndClose } from '../../../../../utils/shared';
import { AUTHOR_EMAIL_ADDRESS, AUTHOR_PASSWORD } from '../../../../constants';

test.describe('RBAC - Permissions enforcement', { tag: ['@critical'] }, () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user without publish permission cannot publish content', async ({ page }) => {
    // Step 1: Remove publish permission from the Author role.
    // The Author role is used (not Editor) because it both has publish on Article — so removing
    // it is a meaningful change — and has the i18n locales property on its read permission, so
    // the user can actually open an article. The Editor role lacks locales on its article-read
    // permission and therefore sees "0 entries" in every locale.
    await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
    await page.getByRole('gridcell', { name: 'Author', exact: true }).click();

    await page.getByRole('tab', { name: 'Collection Types' }).click();
    await page.getByRole('checkbox', { name: 'Select Publish article' }).uncheck();

    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved');

    // Step 2: Log out as admin
    await page.getByRole('button', { name: 'test testing' }).click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();

    // Step 3: Log in as the Author user
    await login({ page, username: AUTHOR_EMAIL_ADDRESS, password: AUTHOR_PASSWORD });

    // Step 4: Navigate to an article.
    // Use navToHeader rather than clicking the "Article" sidebar link directly: opening the
    // Content Manager auto-redirects to the first collection type (Article), and that redirect
    // re-renders the sidebar — clicking the Article link mid-redirect detaches it. navToHeader
    // waits for the "Article" header to settle before continuing.
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: 'West Ham post match analysis' }));

    // Step 5: Assert the UI hides the action — the Publish button is disabled
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();

    // Step 6: Assert the API enforces it too — a direct publish call returns 403.
    // UI hiding alone is not sufficient; the publish route's hasPermissions policy
    // (config: ['plugin::content-manager.explorer.publish']) must reject the request.
    // The documentId is taken from the edit-view URL we are currently on.
    const documentId = page.url().match(/collection-types\/api::article\.article\/([^/?#]+)/)?.[1];
    expect(documentId, 'expected a documentId in the edit-view URL').toBeTruthy();

    const apiLogin = await page.request.post('/admin/login', {
      data: { email: AUTHOR_EMAIL_ADDRESS, password: AUTHOR_PASSWORD },
    });
    const token = (await apiLogin.json()).data?.token;
    expect(token, 'API login as the author failed').toBeTruthy();

    const publishRes = await page.request.post(
      `/content-manager/collection-types/api::article.article/${documentId}/actions/publish?locale=en`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(publishRes.status()).toBe(403);
  });
});
