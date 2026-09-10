import { test, expect } from '@playwright/test';

import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import {
  ARTICLE_LIST_URL,
  DEFAULT_WORKSPACE,
  SUB_WORKSPACE,
  pinWorkspace,
  resetWorkspaces,
  waitForAdminReady,
  workspaceSwitcher,
} from './utils';

const CTB_ARTICLE_URL = '/admin/plugins/content-type-builder/content-types/api::article.article';
const READ_ONLY_NOTICE = 'Content types are managed from the Default workspace';

test.describe('Workspaces — settings and schema scope', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    // The fixture predates the workspace permissions, so the restored super
    // admin would not hold them (no "Workspaces" settings, no move action).
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
    await waitForAdminReady(page);
    await resetWorkspaces(page);
    await pinWorkspace(page, DEFAULT_WORKSPACE);
  });

  test('Workspaces settings exist in the default workspace only', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.getByRole('link', { name: 'Workspaces', exact: true })).toBeVisible();

    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto('/admin/settings');

    await expect(page.getByRole('link', { name: 'Workspaces', exact: true })).toBeHidden();
  });

  /**
   * Creating a workspace must not switch into it: the whole Workspaces settings
   * area is default-only, so the page it returns to would answer 404 and the
   * admin would render its generic error screen.
   */
  test('creating a workspace lands back on the list, still in the default workspace', async ({
    page,
  }) => {
    await page.goto('/admin/settings/workspaces');
    await page.getByRole('button', { name: 'Add a workspace' }).click();

    await page.getByRole('textbox', { name: 'Name' }).fill('Globex');
    await page.getByRole('button', { name: 'Create workspace' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/settings\/workspaces$/);
    await expect(page.getByText('Something went wrong')).toBeHidden();
    await expect(workspaceSwitcher(page)).toContainText('Default');
    await expect(page.getByRole('row').filter({ hasText: 'globex' })).toBeVisible();
  });

  test('a new workspace can then be selected from the switcher', async ({ page }) => {
    await page.goto('/admin/settings/workspaces');
    await page.getByRole('button', { name: 'Add a workspace' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Globex');
    await page.getByRole('button', { name: 'Create workspace' }).click();
    await page.waitForLoadState('networkidle');

    await workspaceSwitcher(page).click();
    await page.getByRole('menuitem', { name: 'Globex', exact: true }).click();
    await page.waitForLoadState('networkidle');

    await expect(workspaceSwitcher(page)).toContainText('Globex');
  });

  /**
   * The schema is global. Outside the default workspace the builder stays
   * browsable but every editing affordance is gone, and the server refuses the
   * writes as the enforcement half.
   */
  /**
   * The schema is one shared thing — every workspace's entries are rows of the
   * same tables — so it is defined in the default workspace and nowhere else.
   * Not shown read-only elsewhere: not shown at all.
   */
  test('the Content-Type Builder does not exist outside the default workspace', async ({
    page,
  }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);

    await expect(page.getByRole('link', { name: /Content-Type Builder/ })).toBeHidden();

    // …and typing the URL in gets the admin's own refusal, not the builder.
    await page.goto(CTB_ARTICLE_URL);
    await expect(page.getByRole('button', { name: /Add another field/ })).toBeHidden();
    await expect(page.getByText(/permissions to access that content/i)).toBeVisible();
  });

  test('the Content-Type Builder stays editable in the default workspace', async ({ page }) => {
    await page.goto(CTB_ARTICLE_URL);

    await expect(page.getByRole('button', { name: /Add another field/ }).first()).toBeVisible();
    await expect(page.getByText(READ_ONLY_NOTICE)).toBeHidden();
  });
});
