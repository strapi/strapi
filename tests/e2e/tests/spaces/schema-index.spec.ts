import { test, expect } from '@playwright/test';

import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { DEFAULT_WORKSPACE, pinWorkspace, resetWorkspaces, waitForAdminReady } from './utils';

const CTB_URL = '/admin/plugins/content-type-builder';

/**
 * The builder's front door: what distinguishes one schema from another, before
 * you pick one. The columns come from the plugins that own the options — i18n
 * and workspaces — so this also covers the registry that lets them.
 */
test.describe('Content-Type Builder — all content types', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
    await waitForAdminReady(page);
    await resetWorkspaces(page);
    await pinWorkspace(page, DEFAULT_WORKSPACE);
  });

  test('lands on the index and shows what each schema is configured with', async ({ page }) => {
    await page.goto(CTB_URL);

    await expect(page.getByRole('heading', { name: 'All content types' })).toBeVisible();

    /**
     * The columns that were invisible without a modal. The admin's table is a
     * `grid`, so its header cells are gridcells — asserted through the header
     * row's text, which is what a reader actually sees.
     */
    const headerRow = page.getByRole('row').first();
    await expect(headerRow).toContainText('Internationalization');
    await expect(headerRow).toContainText('Workspaces');
    await expect(headerRow).toContainText('Draft & publish');

    // …and a row that answers those questions without opening anything. The
    // API id is behind the icon beside the name, so the row is found by name.
    await expect(page.getByRole('row').filter({ hasText: 'Article' }).first()).toContainText(
      'All workspaces'
    );
  });

  test('searching narrows the table', async ({ page }) => {
    await page.goto(CTB_URL);
    await expect(page.getByRole('row').filter({ hasText: 'Article' })).toBeVisible();

    // Search collapses to its icon until asked for, exactly as it does in the
    // Content Manager.
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    // …and it applies on submit, also as it does there.
    await page.getByRole('searchbox', { name: 'Search schemas' }).fill('author');
    await page.getByRole('searchbox', { name: 'Search schemas' }).press('Enter');

    await expect(page.getByRole('row').filter({ hasText: 'Author' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Article' })).toBeHidden();
  });

  test('a row opens the schema, where Save now lives', async ({ page }) => {
    await page.goto(CTB_URL);

    await page.getByRole('row').filter({ hasText: 'Article' }).click();

    await expect(page).toHaveURL(/content-types\/api::article\.article/);
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('creating is one button with three choices', async ({ page }) => {
    await page.goto(CTB_URL);

    await page.getByRole('button', { name: 'Create new' }).click();

    await expect(page.getByRole('menuitem', { name: 'Collection type' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Single type' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Component' })).toBeVisible();
  });
});
