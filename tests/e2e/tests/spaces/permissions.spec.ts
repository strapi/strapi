import { test, expect } from '@playwright/test';

import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD } from '../../constants';
import {
  ARTICLE_LIST_URL,
  ARTICLE_UID,
  DEFAULT_WORKSPACE,
  SUB_WORKSPACE,
  WORKSPACE_NAMES,
  bindRoleToWorkspaces,
  createArticle,
  listRow,
  loginViaApi,
  logout,
  pinWorkspace,
  resetWorkspaces,
  waitForAdminReady,
  workspaceSwitcher,
} from './utils';

const OWNED_BY_DEFAULT = 'Owned by Default';
const OWNED_BY_ACME = 'Owned by Acme';

/**
 * Membership, from a real second identity rather than a header swap: a super
 * admin belongs everywhere, so nothing they do proves the boundary holds.
 *
 * The Editor role starts platform-wide (bound to no workspace), which means
 * "member of every workspace" — the state a fresh install is in. Binding it to
 * Acme is what makes the editor a genuinely restricted admin.
 */
test.describe('Workspaces — membership and permissions', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
    await waitForAdminReady(page);
    await resetWorkspaces(page);
    await pinWorkspace(page, DEFAULT_WORKSPACE);

    await createArticle(page, { title: OWNED_BY_DEFAULT, workspace: DEFAULT_WORKSPACE });
    await createArticle(page, { title: OWNED_BY_ACME, workspace: SUB_WORKSPACE });
    await bindRoleToWorkspaces(page, 'strapi-editor', [SUB_WORKSPACE]);
  });

  test('an admin restricted to one workspace is only offered that one', async ({ page }) => {
    await logout(page);
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await waitForAdminReady(page);

    await expect(workspaceSwitcher(page)).toContainText(WORKSPACE_NAMES[SUB_WORKSPACE]);

    await workspaceSwitcher(page).click();
    await expect(
      page.getByRole('menuitem', { name: WORKSPACE_NAMES[SUB_WORKSPACE], exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: WORKSPACE_NAMES[DEFAULT_WORKSPACE], exact: true })
    ).toBeHidden();
  });

  test('a restricted admin sees only their workspace’s entries', async ({ page }) => {
    await logout(page);
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await waitForAdminReady(page);

    await page.goto(ARTICLE_LIST_URL);

    await expect(listRow(page, OWNED_BY_ACME)).toBeVisible();
    await expect(listRow(page, OWNED_BY_DEFAULT)).toBeHidden();
  });

  /**
   * The check that matters: the workspace is chosen by a request header, so a
   * restricted admin must not be able to reach another workspace — least of all
   * the default one, whose view spans every workspace.
   */
  test('the server refuses a workspace the admin does not belong to', async ({ page }) => {
    const token = await loginViaApi(page, EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD);
    const url = `/content-manager/collection-types/${ARTICLE_UID}?pageSize=50`;

    const own = await page.request.get(url, {
      headers: { Authorization: `Bearer ${token}`, 'X-Strapi-Space-Id': SUB_WORKSPACE },
    });
    expect(own.status()).toBe(200);

    const other = await page.request.get(url, {
      headers: { Authorization: `Bearer ${token}`, 'X-Strapi-Space-Id': DEFAULT_WORKSPACE },
    });
    expect(other.status()).toBe(403);
    expect((await other.json()).error.message).toContain('not a member');
  });

  /**
   * Omitting the header used to mean "platform view": no workspace filter at
   * all. For an authenticated admin that was a way around the boundary.
   */
  test('omitting the workspace header does not widen what a restricted admin sees', async ({
    page,
  }) => {
    const token = await loginViaApi(page, EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD);

    const response = await page.request.get(
      `/content-manager/collection-types/${ARTICLE_UID}?pageSize=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(response.status()).toBe(403);
  });

  test('a super admin still reaches every workspace', async ({ page }) => {
    const url = `/content-manager/collection-types/${ARTICLE_UID}?pageSize=50`;
    const headers = { 'X-Strapi-Space-Id': DEFAULT_WORKSPACE };

    await page.goto(ARTICLE_LIST_URL);
    await expect(listRow(page, OWNED_BY_ACME)).toBeVisible();
    await expect(listRow(page, OWNED_BY_DEFAULT)).toBeVisible();

    const token = await loginViaApi(page, 'test@testing.com', 'Testing123!');
    const response = await page.request.get(url, {
      headers: { ...headers, Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
  });
});
