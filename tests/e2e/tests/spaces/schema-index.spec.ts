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

  /**
   * The way into a schema of another kind, and the path the Content Manager's
   * history suite takes to reach one: pick the tab, then the row.
   */
  test('a tab narrows the table to its kind', async ({ page }) => {
    await page.goto(CTB_URL);

    await page.getByRole('tab', { name: /^Single types/ }).click();

    await expect(page.getByRole('row').filter({ hasText: 'Article' })).toBeHidden();
    await page.getByRole('row').filter({ hasText: 'Homepage' }).first().click();

    await expect(page).toHaveURL(/content-types\/api::homepage\.homepage/);
  });

  /**
   * What replaced the sidebar: the breadcrumb says where you are, and its
   * caret is how you get anywhere else — including to a component, which the
   * sidebar's one real advantage was reaching in a single step.
   */
  test('the breadcrumb switches between any two schemas', async ({ page }) => {
    await page.goto(`${CTB_URL}/content-types/api::article.article`);

    await expect(page.getByRole('link', { name: 'Collection types' })).toHaveAttribute(
      'href',
      /kind=collectionType/
    );

    await page.getByRole('button', { name: /go to another content type or component/ }).click();
    await page
      .getByRole('searchbox', { name: 'Search content types and components' })
      .fill('author');
    await page.getByRole('button', { name: /^Author/ }).click();

    await expect(page).toHaveURL(/content-types\/api::author\.author/);
    await expect(page.getByRole('heading', { name: 'Author' })).toBeVisible();
  });

  test('the breadcrumb leads back to the index on the right tab', async ({ page }) => {
    await page.goto(`${CTB_URL}/content-types/api::homepage.homepage`);

    await page.getByRole('link', { name: 'Single types' }).click();

    await expect(page.getByRole('heading', { name: 'All content types' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Single types/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  /**
   * Unsaved work is spread across the builder, and seeing all of it meant
   * opening each schema in turn. The status has to survive the trip back to
   * the index — which is a client-side one, since a reload discards it.
   */
  test('the index says which schemas have unsaved changes', async ({ page }) => {
    await page.goto(`${CTB_URL}/content-types/api::article.article`);

    await page
      .getByRole('button', { name: /^Add another field/ })
      .first()
      .click();
    await page.getByRole('button', { name: /Text Small or long text/ }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('subtitle');
    await page.getByRole('button', { name: 'Finish' }).click();

    await page.getByRole('link', { name: 'Collection types' }).click();
    await expect(page.getByRole('heading', { name: 'All content types' })).toBeVisible();

    await expect(
      page.getByRole('row').filter({ hasText: 'Article' }).first().getByText('Modified')
    ).toBeVisible();
    await expect(
      page.getByRole('row').filter({ hasText: 'Author' }).first().getByText('Modified')
    ).toHaveCount(0);
  });

  test('creating is one button with three choices', async ({ page }) => {
    await page.goto(CTB_URL);

    await page.getByRole('button', { name: 'Create new' }).click();

    await expect(page.getByRole('menuitem', { name: 'Collection type' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Single type' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Component' })).toBeVisible();
  });
});
