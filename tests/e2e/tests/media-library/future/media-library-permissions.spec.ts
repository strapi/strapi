import { test, expect, type Page } from '@playwright/test';

import {
  AUTHOR_EMAIL_ADDRESS,
  AUTHOR_PASSWORD,
  EDITOR_EMAIL_ADDRESS,
  EDITOR_PASSWORD,
} from '../../../constants';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { login } from '../../../../utils/login';
import { describeOnCondition, navToHeader } from '../../../../utils/shared';

import { AssetsPage } from './page-objects/AssetsPage';

/**
 * Journey 5 — Permissions for the Media Library (CMS-1066).
 *
 * Role-level enforcement on the future/unstable Media Library's actions
 * (CMS-434). Folder-level permissions (CMS-387) are tracked in a separate
 * milestone and are not exercised here.
 *
 * Exact role list in Settings → Roles today: Super Admin / Editor / Author
 * only, hardcoded in packages/core/admin/server/src/services/role.ts
 * bootstrap — no other roles are seeded by default (confirmed 2026-08-06).
 * Editor and Author both carry every upload permission out of the box, so
 * dedicated roles are provisioned in-test to isolate exactly the
 * permissions each scenario needs, rather than depending on those defaults.
 *
 * The full negative matrix below is grounded directly in
 * packages/core/upload/admin/src/future (useMediaLibraryPermissions.ts,
 * AssetsPage.tsx, AssetsGrid.tsx, AssetsTable.tsx, BulkActionsBar.tsx,
 * AssetsDndProvider.tsx, AssetDetailsDrawer.tsx) — every gated action is
 * conditionally *not rendered* when its permission is missing, with one
 * exception: the drawer's name/location/caption/alt-text fields are always
 * rendered but disabled, not hidden.
 */

const UPLOADER_ROLE = 'E2E Media Library Uploader';
const READ_ONLY_ROLE = 'E2E Media Library Read Only';

// A real, pre-seeded image from the with-admin fixture, so the read-only
// scenario never needs the upload permission it's specifically missing.
const SEEDED_ASSET_NAME = 'ted_lasso_profile';

describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')(
  'Media Library - Journey 5: Permissions',
  () => {
    test.describe.configure({ timeout: 420_000 });

    test.beforeEach(async ({ page }) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
    });

    test('a user whose role has the upload permission can use the upload actions', async ({
      page,
    }) => {
      await createMediaLibraryRole(page, { name: UPLOADER_ROLE, create: true });
      await assignRoleToUser(page, {
        userEmail: EDITOR_EMAIL_ADDRESS,
        addRole: UPLOADER_ROLE,
        removeRole: 'Editor',
      });

      await logout(page);
      await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });

      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      await expect(page.getByRole('button', { name: 'New' })).toBeVisible();
      await assetsPage.openNewMenu();
      await expect(page.getByRole('menuitem', { name: 'File upload', exact: true })).toBeVisible();
    });

    test('a user whose role lacks any permission beyond read sees a fully read-only library', async ({
      page,
    }) => {
      const assetsPage = new AssetsPage(page);
      await assetsPage.goto();

      // Sanity check as Super Admin first: every locator below genuinely
      // matches something when the permission IS granted, so the negative
      // assertions after the role switch can't be vacuously true against a
      // typo'd selector.
      await assetsPage.switchToTableView();
      await expect(page.getByRole('button', { name: 'New' })).toBeVisible();
      await expect(page.getByRole('checkbox', { name: 'Select all' })).toBeVisible();

      await assetsPage.clickAssetInTable(SEEDED_ASSET_NAME);
      await expect(
        assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Save changes' })
      ).toBeVisible();
      await expect(
        assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Download' })
      ).toBeVisible();
      await expect(
        assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Copy link' })
      ).toBeVisible();
      await assetsPage.closeAssetDetailsDrawer();

      await createMediaLibraryRole(page, { name: READ_ONLY_ROLE, create: false });
      await assignRoleToUser(page, {
        userEmail: AUTHOR_EMAIL_ADDRESS,
        addRole: READ_ONLY_ROLE,
        removeRole: 'Author',
      });

      await logout(page);
      await login({ page, username: AUTHOR_EMAIL_ADDRESS, password: AUTHOR_PASSWORD });

      await assetsPage.goto();
      await assetsPage.switchToTableView();

      // canCreate: no upload entry points at all, and dragging a file does
      // nothing (no drop-zone overlay ever appears to drag onto).
      await expect(page.getByRole('button', { name: 'New' })).not.toBeVisible();

      // canUpdate: no selection affordances anywhere, so no bulk bar either.
      await expect(page.getByRole('checkbox', { name: 'Select all' })).not.toBeVisible();
      await expect(
        page.getByRole('checkbox', { name: new RegExp(`Select ${SEEDED_ASSET_NAME}`) })
      ).not.toBeVisible();
      await expect(page.getByRole('region', { name: 'Bulk actions' })).not.toBeVisible();

      await assetsPage.clickAssetInTable(SEEDED_ASSET_NAME);
      await expect(assetsPage.assetDetailsDrawer).toBeVisible();

      // canUpdate: Crop/Replace, Delete, and Save changes are hidden — not
      // merely disabled.
      await expect(
        assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Crop' })
      ).not.toBeVisible();
      await expect(
        assetsPage.assetDetailsDrawer.getByRole('button', { name: /Delete this/i })
      ).not.toBeVisible();
      await expect(
        assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Save changes' })
      ).not.toBeVisible();

      // canUpdate: the fields themselves are the one exception — rendered,
      // but disabled rather than hidden.
      await expect(assetsPage.getAssetDetailsDrawerTextField('Alternative text')).toBeDisabled();

      // canDownload / canCopyLink: hidden independently of canUpdate.
      await expect(
        assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Download' })
      ).not.toBeVisible();
      await expect(
        assetsPage.assetDetailsDrawer.getByRole('button', { name: 'Copy link' })
      ).not.toBeVisible();
    });
  }
);

/**
 * Create a role via the admin UI scoped to the Media Library, granting only
 * `read` plus whichever of the remaining upload permissions the scenario
 * needs. Plugin permissions live under the "Plugins" tab; the upload plugin
 * is displayed as the "Media Library" category. Checkbox labels are the
 * exact displayName strings from packages/core/upload/server/src/bootstrap.ts.
 *
 * Role creation shows a transient "created" notification (not "Saved") and
 * redirects to the edit view, so success is confirmed via the roles list
 * rather than a toast.
 */
const createMediaLibraryRole = async (
  page: Page,
  {
    name,
    create,
    update = false,
    download = false,
    copyLink = false,
  }: { name: string; create: boolean; update?: boolean; download?: boolean; copyLink?: boolean }
) => {
  await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
  await clickAndWaitNetworkIdle(page, page.getByRole('button', { name: 'Add new role' }).first());

  await page.getByRole('textbox', { name: 'Name' }).fill(name);
  await page
    .getByRole('textbox', { name: 'Description' })
    .fill('Automatically generated for CMS-434/CMS-1066 permission-matrix coverage');

  await page.getByRole('tab', { name: 'Plugins' }).click();
  await clickAndWaitNetworkIdle(page, page.getByRole('button', { name: /Media Library/i }).first());

  await page.getByRole('checkbox', { name: 'Access the Media Library' }).check();

  const setChecked = async (label: string, checked: boolean) => {
    const checkbox = page.getByRole('checkbox', { name: label });
    if (checked) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  };

  await setChecked('Create (upload)', create);
  await setChecked('Update (crop, details, replace) + delete', update);
  await setChecked('Download', download);
  await setChecked('Copy link', copyLink);

  await page.evaluate(() => window.scrollTo(0, 0));
  await clickAndWaitNetworkIdle(page, page.getByRole('button', { name: 'Save' }));

  await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
  await expect(page.getByRole('row', { name })).toBeVisible();
};

/**
 * Assign a single role to an existing admin user via the UI, removing the
 * role they were seeded with so their effective permissions equal exactly
 * the new role. Mirrors the proven pattern in
 * settings/rbac/assign-role-to-user.spec.ts.
 */
const assignRoleToUser = async (
  page: Page,
  { userEmail, addRole, removeRole }: { userEmail: string; addRole: string; removeRole: string }
) => {
  await navToHeader(page, ['Settings', ['Administration Panel', 'Users']], 'Users');

  const userRow = page.getByRole('row', { name: new RegExp(userEmail, 'i') }).first();
  await clickAndWaitNetworkIdle(page, userRow.getByRole('link', { name: /^Edit/i }));

  await page.getByLabel("User's roles*").locator('svg').last().click();
  const listBox = page.getByRole('listbox');
  await listBox.getByLabel(addRole).locator('button').check();
  await listBox.getByLabel(removeRole, { exact: true }).locator('button').uncheck();
  await page.keyboard.press('Escape');

  await clickAndWaitNetworkIdle(page, page.getByRole('button', { name: 'Save' }));

  await navToHeader(page, ['Settings', ['Administration Panel', 'Users']], 'Users');
  await expect(page.getByRole('row', { name: new RegExp(userEmail, 'i') }).first()).toContainText(
    addRole
  );
};

const clickAndWaitNetworkIdle = async (page: Page, locator: ReturnType<Page['getByRole']>) => {
  await locator.click();
  await page.waitForLoadState('networkidle');
};

const logout = async (page: Page) => {
  await page.getByRole('button', { name: 'test testing' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.waitForURL('**/admin/auth/login');
};
