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
} from './utils';

const ENTRY = 'Announcement';

/**
 * The full life of one entry created in the default workspace: exclusive →
 * shared with every workspace → exclusive again. The middle state is the one
 * with teeth, because a shared entry is visible everywhere but writable from
 * default only.
 */
test.describe('Workspaces — sharing an entry and taking it back', () => {
  let documentId: string;

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
    await waitForAdminReady(page);
    await resetWorkspaces(page);
    await pinWorkspace(page, DEFAULT_WORKSPACE);

    documentId = await createArticle(page, { title: ENTRY, workspace: DEFAULT_WORKSPACE });
  });

  test('an entry created in default is invisible elsewhere until it is shared', async ({
    page,
  }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);
    await expect(listRow(page, ENTRY)).toBeHidden();

    await pinWorkspace(page, DEFAULT_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await page.getByRole('button', { name: 'Share with every workspace' }).click();
    await expect(page.getByText('Entry shared with every workspace.')).toBeVisible();

    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);
    await expect(listRow(page, ENTRY)).toBeVisible();
  });

  test('a shared entry is read-only in the workspaces it reaches', async ({ page }) => {
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await page.getByRole('button', { name: 'Share with every workspace' }).click();
    await expect(page.getByText('Entry shared with every workspace.')).toBeVisible();

    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);

    await expect(page.getByRole('textbox', { name: 'title' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

    // The reason is stated twice on purpose — as the disabled lock in the
    // header, and in the Workspace panel.
    const lockCopy = /Read-only: this entry is shared with every workspace/;
    await expect(page.getByRole('button', { name: lockCopy })).toBeDisabled();
    await expect(page.getByText(lockCopy).last()).toBeVisible();
  });

  /**
   * Sharing has to be reversible. The panel offers every workspace as the new
   * owner — including the default one, which is the likely answer and was
   * missing while the picker excluded the workspace you were standing in.
   */
  test('sharing can be taken back, and the entry leaves the other workspaces', async ({ page }) => {
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await page.getByRole('button', { name: 'Share with every workspace' }).click();
    await expect(page.getByText('Entry shared with every workspace.')).toBeVisible();

    await page.getByRole('button', { name: 'Stop sharing…' }).click();
    await expect(page.getByRole('heading', { name: 'Stop sharing this entry' })).toBeVisible();

    await page.getByRole('combobox', { name: 'Move this entry to:' }).click();
    await expect(
      page.getByRole('option', { name: WORKSPACE_NAMES[DEFAULT_WORKSPACE], exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('option', { name: WORKSPACE_NAMES[SUB_WORKSPACE], exact: true })
    ).toBeVisible();
    // Sharing again is not a target here; the entry is already shared.
    await expect(page.getByRole('option', { name: /Shared with every workspace/ })).toBeHidden();

    await page
      .getByRole('option', { name: WORKSPACE_NAMES[DEFAULT_WORKSPACE], exact: true })
      .click();
    await page.getByRole('button', { name: 'Stop sharing', exact: true }).click();
    await page.waitForLoadState('networkidle');

    // Back to being the default workspace's own entry: it can be shared again,
    // and the "stop sharing" affordance is gone.
    await expect(page.getByRole('button', { name: 'Share with every workspace' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stop sharing…' })).toBeHidden();

    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);
    await expect(listRow(page, ENTRY)).toBeHidden();
  });

  test('un-sharing can hand the entry to another workspace instead', async ({ page }) => {
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await page.getByRole('button', { name: 'Share with every workspace' }).click();
    await expect(page.getByText('Entry shared with every workspace.')).toBeVisible();

    await page.getByRole('button', { name: 'Stop sharing…' }).click();
    await page.getByRole('combobox', { name: 'Move this entry to:' }).click();
    await page.getByRole('option', { name: WORKSPACE_NAMES[SUB_WORKSPACE], exact: true }).click();
    await page.getByRole('button', { name: 'Stop sharing', exact: true }).click();
    await page.waitForLoadState('networkidle');

    await page.goto(ARTICLE_LIST_URL);
    await expect(listRow(page, ENTRY)).toContainText(WORKSPACE_NAMES[SUB_WORKSPACE]);

    // Now owned by Acme, so Acme may write it again.
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await expect(page.getByRole('textbox', { name: 'title' })).toBeEnabled();
  });

  test('a sub-workspace cannot share an entry it owns', async ({ page }) => {
    const acmeId = await createArticle(page, { title: 'Acme only', workspace: SUB_WORKSPACE });

    const response = await page.request.post('/spaces/move', {
      headers: await adminApiHeaders(page, SUB_WORKSPACE),
      data: { uid: ARTICLE_UID, documentIds: [acmeId], targetSpaceSlug: null },
    });

    expect(response.status()).toBe(403);
    expect((await response.json()).error.message).toContain(
      'Only the default workspace can share entries'
    );
  });
});
