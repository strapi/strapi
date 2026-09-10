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
  shareEntries,
  waitForAdminReady,
} from './utils';

const ENTRY = 'Company handbook';
const LOCAL_TITLE = 'Acme handbook';

const titleField = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'title' });

/**
 * Inheritance, from the admin: an entry shared from the default workspace is
 * read by every workspace until one of them takes its own version of it, and
 * resetting puts that workspace back on the original.
 */
test.describe('Workspaces — inherited entries and overrides', () => {
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
    await shareEntries(page, [documentId]);
  });

  test('a workspace can take its own version of an inherited entry', async ({ page }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);

    // Inherited: read-only, with the way out offered right there.
    await expect(titleField(page)).toBeDisabled();
    await page.getByRole('button', { name: 'Override in this workspace' }).click();
    await expect(page.getByRole('heading', { name: 'Override this entry' })).toBeVisible();
    await page.getByRole('button', { name: 'Override', exact: true }).click();

    await expect(titleField(page)).toBeEnabled();
    await expect(page.getByText('This workspace has its own version of this entry.')).toBeVisible();

    await titleField(page).fill(LOCAL_TITLE);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved document')).toBeVisible();
  });

  test('the version stays in the workspace that made it', async ({ page }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await page.getByRole('button', { name: 'Override in this workspace' }).click();
    await page.getByRole('button', { name: 'Override', exact: true }).click();
    await expect(titleField(page)).toBeEnabled();
    await titleField(page).fill(LOCAL_TITLE);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved document')).toBeVisible();

    // The default workspace keeps reading the original, once.
    await pinWorkspace(page, DEFAULT_WORKSPACE);
    await page.goto(ARTICLE_LIST_URL);
    await expect(listRow(page, ENTRY)).toBeVisible();
    await expect(listRow(page, LOCAL_TITLE)).toBeHidden();

    // …and says who has stopped following it.
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await expect(page.getByText('Inheritance')).toBeVisible();
    await expect(page.getByText('1 workspace has its own version')).toBeVisible();
  });

  test('resetting puts the workspace back on the original', async ({ page }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await page.getByRole('button', { name: 'Override in this workspace' }).click();
    await page.getByRole('button', { name: 'Override', exact: true }).click();
    await expect(titleField(page)).toBeEnabled();
    await titleField(page).fill(LOCAL_TITLE);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved document')).toBeVisible();

    await page.getByRole('button', { name: 'Reset to the original' }).click();
    await expect(page.getByRole('heading', { name: 'Reset to the original' })).toBeVisible();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();

    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await expect(titleField(page)).toHaveValue(ENTRY);
    await expect(titleField(page)).toBeDisabled();
  });

  /**
   * Editing the original keeps reaching the workspaces that still read it, and
   * stops at the one that took its own version — which is the whole promise.
   */
  test('changes to the original reach the workspaces still reading it', async ({ page }) => {
    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await page.getByRole('button', { name: 'Override in this workspace' }).click();
    await page.getByRole('button', { name: 'Override', exact: true }).click();
    await expect(titleField(page)).toBeEnabled();

    await pinWorkspace(page, DEFAULT_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await titleField(page).fill('Handbook 2026');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved document')).toBeVisible();

    await pinWorkspace(page, SUB_WORKSPACE);
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);
    await expect(titleField(page)).toHaveValue(ENTRY);
  });

  test('the default workspace is never offered an override of its own entry', async ({ page }) => {
    await page.goto(`${ARTICLE_LIST_URL}/${documentId}`);

    await expect(page.getByRole('button', { name: 'Override in this workspace' })).toBeHidden();
    await expect(page.getByText('No workspace has overridden it.')).toBeVisible();
  });
});
