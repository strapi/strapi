import { test, expect } from '@playwright/test';

import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import {
  ARTICLE_LIST_URL,
  ARTICLE_UID,
  DEFAULT_WORKSPACE,
  SUB_WORKSPACE,
  WORKSPACE_NAMES,
  adminApiHeaders,
  createArticle,
  listRow,
  pinWorkspace,
  resetWorkspaces,
  waitForAdminReady,
  selectListRow,
  shareEntries,
} from './utils';

const SHARED = 'Shared with everyone';
const EXCLUSIVE = 'Exclusive to Default';

const MOVE_ACTION = /Move to workspace/;

test.describe('Workspaces — shared entries', () => {
  let sharedId: string;

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

    sharedId = await createArticle(page, { title: SHARED, workspace: DEFAULT_WORKSPACE });
    await createArticle(page, { title: EXCLUSIVE, workspace: DEFAULT_WORKSPACE });
    await shareEntries(page, [sharedId]);
  });

  test('a shared entry is visible in a sub-workspace and marked as shared in default', async ({
    page,
  }) => {
    await page.goto(ARTICLE_LIST_URL);
    await expect(listRow(page, SHARED)).toContainText('Shared');

    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);
    await expect(listRow(page, SHARED)).toBeVisible();
    await expect(listRow(page, EXCLUSIVE)).toBeHidden();
  });

  /**
   * The rule the product owner set: outside the default workspace a shared entry
   * allows nothing that mutates it. Duplicating, opening it and reading history
   * stay available.
   */
  test('a shared entry is read-only in a sub-workspace', async ({ page }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}/${sharedId}`);

    await expect(page.getByRole('textbox', { name: 'title' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
    await expect(
      page.getByRole('button', { name: /Read-only: this entry is shared/ })
    ).toBeVisible();
  });

  test('the delete actions of a shared entry are disabled in the edit view', async ({ page }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}/${sharedId}`);

    await page.getByRole('button', { name: 'More actions' }).click();

    await expect(page.getByRole('menuitem', { name: /Delete entry/ }).first()).toBeDisabled();
  });

  /**
   * The list row menu is a second, independent set of document actions — and the
   * surface the read-only complaint started from. Read-only entries keep the
   * actions that only read (opening, duplicating).
   */
  test('the row menu of a shared entry disables writes but keeps the read actions', async ({
    page,
  }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);

    await listRow(page, SHARED).getByRole('button', { name: 'Row actions' }).click();

    await expect(page.getByRole('menuitem', { name: /Delete entry/ }).first()).toBeDisabled();
    await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeEnabled();
    await expect(page.getByRole('menuitem', { name: 'Open in new tab' })).toBeEnabled();
  });

  test('bulk actions are disabled when a shared entry is selected in a sub-workspace', async ({
    page,
  }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);

    await selectListRow(page, SHARED);

    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
  });

  /**
   * A shared entry has no workspace to be moved out of, so the action must not
   * be offered — neither alone nor mixed into a selection of movable entries.
   */
  test('a shared entry is never offered the move action', async ({ page }) => {
    await page.goto(ARTICLE_LIST_URL);

    await selectListRow(page, EXCLUSIVE);
    await expect(page.getByRole('button', { name: MOVE_ACTION })).toBeVisible();

    await selectListRow(page, SHARED);
    await expect(page.getByRole('button', { name: MOVE_ACTION })).toBeHidden();
  });

  test('the workspace panel offers sharing and moving only for an exclusive entry', async ({
    page,
  }) => {
    await page.goto(ARTICLE_LIST_URL);
    await listRow(page, EXCLUSIVE).getByRole('link').first().click();

    await expect(page.getByText('Share with every workspace')).toBeVisible();
    await expect(page.getByText('Move to a workspace…')).toBeVisible();

    await page.goto(`${ARTICLE_LIST_URL}/${sharedId}`);

    await expect(page.getByText('This entry is shared with every workspace.')).toBeVisible();
    await expect(page.getByText('Move to a workspace…')).toBeHidden();
  });

  test('the server refuses a write to a shared entry from a sub-workspace', async ({ page }) => {
    const response = await page.request.put(
      `/content-manager/collection-types/${ARTICLE_UID}/${sharedId}`,
      {
        headers: await adminApiHeaders(page, SUB_WORKSPACE),
        data: { title: 'Edited from Acme' },
      }
    );

    expect(response.status()).toBe(403);
    expect((await response.json()).error.message).toContain(
      'can only be edited from the default workspace'
    );
  });

  test('moving an entry hands it over to the target workspace', async ({ page }) => {
    await page.goto(ARTICLE_LIST_URL);
    await selectListRow(page, EXCLUSIVE);

    await page.getByRole('button', { name: MOVE_ACTION }).click();
    await expect(page.getByRole('heading', { name: 'Move to another workspace' })).toBeVisible();

    await page.getByRole('combobox', { name: 'Move this entry to:' }).click();
    await page.getByRole('option', { name: WORKSPACE_NAMES[SUB_WORKSPACE], exact: true }).click();
    await page.getByRole('button', { name: 'Move', exact: true }).click();
    await page.waitForLoadState('networkidle');

    // The default workspace keeps seeing it — its Workspace column is the proof
    // it changed hands.
    await expect(listRow(page, EXCLUSIVE)).toContainText(WORKSPACE_NAMES[SUB_WORKSPACE]);

    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);
    await expect(listRow(page, EXCLUSIVE)).toBeVisible();
  });

  /**
   * The other direction, which the default workspace's superset view hides: a
   * sub-workspace that gives an entry away stops seeing it, so the move has to
   * take the admin back to a list that no longer contains it.
   */
  test('a sub-workspace can hand one of its entries to another workspace', async ({ page }) => {
    const own = 'Acme owns this';
    await createArticle(page, { title: own, workspace: SUB_WORKSPACE });

    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}`);
    await expect(listRow(page, own)).toBeVisible();

    await selectListRow(page, own);
    await page.getByRole('button', { name: MOVE_ACTION }).click();
    await page.getByRole('combobox', { name: 'Move this entry to:' }).click();

    // Neither the workspace we are standing in, nor sharing: only the default
    // workspace may share, and moving an entry to where it already is does
    // nothing.
    await expect(
      page.getByRole('option', { name: WORKSPACE_NAMES[SUB_WORKSPACE], exact: true })
    ).toBeHidden();
    await expect(page.getByRole('option', { name: /Shared with every workspace/ })).toBeHidden();

    await page
      .getByRole('option', { name: WORKSPACE_NAMES[DEFAULT_WORKSPACE], exact: true })
      .click();
    await page.getByRole('button', { name: 'Move', exact: true }).click();
    await page.waitForLoadState('networkidle');

    // Gone from the workspace that gave it away…
    await expect(listRow(page, own)).toBeHidden();

    // …and owned by the default workspace, which says so in its column.
    await pinWorkspace(page, DEFAULT_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);
    await expect(listRow(page, own)).toContainText(WORKSPACE_NAMES[DEFAULT_WORKSPACE]);
  });
});
