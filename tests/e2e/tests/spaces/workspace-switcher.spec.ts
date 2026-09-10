import { test, expect } from '@playwright/test';

import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { EDITOR_EMAIL_ADDRESS, EDITOR_PASSWORD } from '../../constants';
import {
  DEFAULT_WORKSPACE,
  SUB_WORKSPACE,
  WORKSPACE_NAMES,
  logout,
  resetWorkspaces,
  waitForAdminReady,
  switchWorkspaceInUi,
  workspaceSwitcher,
} from './utils';

/**
 * No `pinWorkspace` here, deliberately: with nothing stored the admin falls back
 * to the default workspace on its own, which is the starting point these tests
 * want, and writing the slug would blur what "the switcher chose it" proves.
 */
test.describe('Workspaces — switcher', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    // The fixture predates the workspace permissions, so the restored super
    // admin would not hold them (no "Workspaces" settings, no move action).
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
    await waitForAdminReady(page);
    await resetWorkspaces(page);
  });

  test('lists the workspaces the admin belongs to', async ({ page }) => {
    await expect(workspaceSwitcher(page)).toContainText(WORKSPACE_NAMES[DEFAULT_WORKSPACE]);

    await workspaceSwitcher(page).click();

    await expect(
      page.getByRole('menuitem', { name: WORKSPACE_NAMES[DEFAULT_WORKSPACE], exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: WORKSPACE_NAMES[SUB_WORKSPACE], exact: true })
    ).toBeVisible();
  });

  test('switching workspace persists across a reload', async ({ page }) => {
    await switchWorkspaceInUi(page, WORKSPACE_NAMES[SUB_WORKSPACE]);
    await expect(workspaceSwitcher(page)).toContainText(WORKSPACE_NAMES[SUB_WORKSPACE]);

    await page.reload();

    await expect(workspaceSwitcher(page)).toContainText(WORKSPACE_NAMES[SUB_WORKSPACE]);
  });

  /**
   * A stored workspace can stop existing (deleted or archived while an admin had
   * it selected). Every request then carries an unknown header and is refused,
   * so the switcher heals the stored slug — and the screen behind it has to
   * recover too, not stay stuck on the responses that already failed.
   */
  test('recovers when the stored workspace no longer exists', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('strapi-spaces:current-slug', 'deleted-workspace');
    });

    await page.goto('/admin/content-manager/collection-types/api::article.article');

    await expect(workspaceSwitcher(page)).toContainText(WORKSPACE_NAMES[DEFAULT_WORKSPACE]);
    await expect(page.getByRole('heading', { name: 'Article', exact: true })).toBeVisible();
    await expect(page.getByText('Something went wrong')).toBeHidden();
  });

  /**
   * The workspace an admin was last in is remembered server-side, so it follows
   * them to a machine that has never heard of them.
   */
  test('an admin returns to the workspace they last used, from a fresh browser', async ({
    page,
  }) => {
    // The switch persists the workspace server-side without waiting for it —
    // the switch itself must not hang on a bookkeeping call — so wait for that
    // request here rather than racing it with the logout below.
    const remembered = page.waitForResponse(
      (response) =>
        response.url().includes('/spaces/mine/current') &&
        response.request().method() === 'PUT' &&
        response.ok()
    );
    await switchWorkspaceInUi(page, WORKSPACE_NAMES[SUB_WORKSPACE]);
    await expect(workspaceSwitcher(page)).toContainText(WORKSPACE_NAMES[SUB_WORKSPACE]);
    await remembered;

    await logout(page);
    // Everything this browser knew about workspaces, forgotten.
    await page.evaluate(() => {
      window.localStorage.removeItem('strapi-spaces:current-slug');
      window.localStorage.removeItem('strapi-spaces:current-slug-owner');
    });

    await login({ page });
    await waitForAdminReady(page);

    await expect(workspaceSwitcher(page)).toContainText(WORKSPACE_NAMES[SUB_WORKSPACE]);
  });

  /**
   * …and it is *their* workspace, not the browser's. A colleague logging in on
   * the same machine finds their own, which for a first login is the first
   * workspace they belong to.
   */
  test('a second admin on the same browser does not inherit the first one’s workspace', async ({
    page,
  }) => {
    await switchWorkspaceInUi(page, WORKSPACE_NAMES[SUB_WORKSPACE]);
    await expect(workspaceSwitcher(page)).toContainText(WORKSPACE_NAMES[SUB_WORKSPACE]);

    await logout(page);
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await waitForAdminReady(page);

    await expect(workspaceSwitcher(page)).toContainText(WORKSPACE_NAMES[DEFAULT_WORKSPACE]);
  });
});
