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
  WORKSPACE_NAMES,
  createArticle,
  listRow,
  pinWorkspace,
  resetWorkspaces,
  waitForAdminReady,
  switchWorkspaceInUi,
} from './utils';

const OWNED_BY_DEFAULT = 'Owned by Default';
const OWNED_BY_ACME = 'Owned by Acme';

test.describe('Workspaces — content isolation', () => {
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

    await createArticle(page, { title: OWNED_BY_DEFAULT, workspace: DEFAULT_WORKSPACE });
    await createArticle(page, { title: OWNED_BY_ACME, workspace: SUB_WORKSPACE });
  });

  test('a sub-workspace only sees its own entries', async ({ page }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);

    await expect(listRow(page, OWNED_BY_ACME)).toBeVisible();
    await expect(listRow(page, OWNED_BY_DEFAULT)).toBeHidden();
  });

  /**
   * The default workspace is the superset view: it sees every entry, and a
   * "Workspace" column says where each one lives.
   */
  test('the default workspace sees every entry with a Workspace column', async ({ page }) => {
    await page.goto(ARTICLE_LIST_URL);

    await expect(page.getByRole('gridcell', { name: 'Workspace' })).toBeVisible();

    await expect(listRow(page, OWNED_BY_DEFAULT)).toContainText(WORKSPACE_NAMES[DEFAULT_WORKSPACE]);
    await expect(listRow(page, OWNED_BY_ACME)).toContainText(WORKSPACE_NAMES[SUB_WORKSPACE]);
  });

  test('the Workspace column is not shown inside a sub-workspace', async ({ page }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);

    await expect(listRow(page, OWNED_BY_ACME)).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Workspace' })).toBeHidden();
  });

  /**
   * The filter is a relation filter on the workspace slug, so the admin's own
   * machinery turns it into `filters[$and][0][space][slug][$eq]=acme`.
   */
  test('the default workspace can filter the list by workspace', async ({ page }) => {
    await page.goto(ARTICLE_LIST_URL);

    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('combobox', { name: 'Select field' }).click();
    await page.getByRole('option', { name: 'Workspace', exact: true }).click();
    await page.getByRole('combobox', { name: 'Select a workspace' }).click();
    await page.getByRole('option', { name: WORKSPACE_NAMES[SUB_WORKSPACE], exact: true }).click();
    await page.getByRole('button', { name: 'Add filter' }).click();

    await page.waitForLoadState('networkidle');

    await expect(listRow(page, OWNED_BY_ACME)).toBeVisible();
    await expect(listRow(page, OWNED_BY_DEFAULT)).toBeHidden();
  });

  /**
   * The Content Manager remembers list filters per content type, in the URL and
   * in localStorage. The "Workspace" filter only exists in the default
   * workspace, so one left behind would follow the admin into a sub-workspace
   * and quietly empty the list, with no chip to remove it.
   */
  test('a workspace filter does not follow the admin into another workspace', async ({ page }) => {
    await page.goto(ARTICLE_LIST_URL);

    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('combobox', { name: 'Select field' }).click();
    await page.getByRole('option', { name: 'Workspace', exact: true }).click();
    await page.getByRole('combobox', { name: 'Select a workspace' }).click();
    await page
      .getByRole('option', { name: WORKSPACE_NAMES[DEFAULT_WORKSPACE], exact: true })
      .click();
    await page.getByRole('button', { name: 'Add filter' }).click();
    await page.waitForLoadState('networkidle');

    await switchWorkspaceInUi(page, WORKSPACE_NAMES[SUB_WORKSPACE]);

    await expect(page).not.toHaveURL(/space/);
    await expect(listRow(page, OWNED_BY_ACME)).toBeVisible();
    await expect(listRow(page, OWNED_BY_DEFAULT)).toBeHidden();

    // …and it must not come back from the persisted list settings either.
    await page.goto(ARTICLE_LIST_URL);
    await expect(listRow(page, OWNED_BY_ACME)).toBeVisible();
    await expect(listRow(page, OWNED_BY_DEFAULT)).toBeHidden();
  });

  test('an entry created from a sub-workspace stays in it', async ({ page }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);

    await page.getByRole('link', { name: 'Create new entry' }).first().click();
    await page.getByRole('textbox', { name: 'title' }).fill('Written in Acme');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved document')).toBeVisible();

    await pinWorkspace(page, DEFAULT_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);

    await expect(listRow(page, 'Written in Acme')).toContainText(WORKSPACE_NAMES[SUB_WORKSPACE]);
  });
});
