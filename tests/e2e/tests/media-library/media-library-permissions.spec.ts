import { test, expect, type Page } from '@playwright/test';

import {
  AUTHOR_EMAIL_ADDRESS,
  AUTHOR_PASSWORD,
  EDITOR_EMAIL_ADDRESS,
  EDITOR_PASSWORD,
} from '../../constants';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { clickAndWait, navToHeader } from '../../../utils/shared';

/**
 * Journey 5 — Permissions for the Media Library (CMS-1066).
 *
 * Scope: CMS-434 only — role-level upload permission (`plugin::upload.assets.create`).
 * Folder-level permissions (CMS-387) are explicitly OUT of scope for this journey.
 *
 * Expected behavior (from CMS-1066, Journey 5):
 *  - a user with the upload permission sees and can use the upload paths;
 *  - a user whose role lacks the upload permission does NOT see the "New" upload
 *    entries — in current code these are hidden, not disabled
 *    (see upload Header.tsx: the primary-action block renders only `canCreate && ...`);
 *  - dragging a file onto the Media Library does nothing (there is no drop target).
 *
 * ASSUMPTION (flagged for Mark — ticket open question "exact role list in
 * Settings → Roles today"): rather than depend on the seeded Editor/Author roles
 * (which both carry upload-create by default), we provision dedicated roles in-test
 * and strip the seeded role, so the assertion isolates the single `assets.create`
 * permission.
 */

// Display name of the seeded Super Admin in the `with-admin` fixture.
const ADMIN_DISPLAY_NAME = 'tt test testing';

const UPLOADER_ROLE = 'E2E Media Library Uploader';
const READ_ONLY_ROLE = 'E2E Media Library Read Only';

test.describe('Media Library - role-level upload permission (CMS-434)', () => {
  test.describe.configure({ timeout: 420_000 });

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('a user whose role has the upload permission can use the upload actions', async ({
    page,
  }) => {
    await createMediaLibraryRole(page, { name: UPLOADER_ROLE, canUpload: true });
    await assignRoleToUser(page, {
      userEmail: EDITOR_EMAIL_ADDRESS,
      addRole: UPLOADER_ROLE,
      removeRole: 'Editor',
    });

    await logout(page);
    await login({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });

    await navToHeader(page, ['Media Library'], 'Media Library');

    // The upload entry point is present... (on an empty library a create-capable
    // user gets two "Add new assets" buttons — the header one and the empty-state
    // one — so scope to the first/header instance).
    const addAssets = page.getByRole('button', { name: 'Add new assets' }).first();
    await expect(addAssets).toBeVisible();

    // ...and usable: it opens the upload dialog, which exposes the upload paths.
    await clickAndWait(page, addAssets);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('tab', { name: /from url/i })).toBeVisible();
  });

  test('a user whose role lacks the upload permission cannot access any upload path', async ({
    page,
  }) => {
    await createMediaLibraryRole(page, { name: READ_ONLY_ROLE, canUpload: false });
    await assignRoleToUser(page, {
      userEmail: AUTHOR_EMAIL_ADDRESS,
      addRole: READ_ONLY_ROLE,
      removeRole: 'Author',
    });

    await logout(page);
    await login({ page, username: AUTHOR_EMAIL_ADDRESS, password: AUTHOR_PASSWORD });

    // The library itself is reachable (the role keeps `read`)...
    await navToHeader(page, ['Media Library'], 'Media Library');

    // ...but no upload entry points are rendered. Header.tsx gates the entire
    // primary-action block on `canCreate`, so "Add new assets" and "Add new folder"
    // are absent. This also covers the drag-and-drop path: with no drop target /
    // dialog trigger available, dragging a file onto the page does nothing.
    //
    // NOTE: we assert the *absence of upload affordances* rather than simulating a
    // real OS file-drag (which Playwright cannot drive reliably). Flagged in the
    // report as an interpretation of the ticket's "dragging does nothing" clause.
    await expect(page.getByRole('button', { name: 'Add new assets' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Add new folder' })).toBeHidden();
  });
});

/**
 * Create a role via the admin UI that can access the Media Library, optionally
 * granting the upload (`assets.create`) permission. Plugin permissions live under
 * the "Plugins" tab; the upload plugin is displayed as the "Media Library" category.
 *
 * Role creation shows a transient "created" notification (not "Saved") and redirects
 * to the edit view, so we confirm success via the roles list rather than a toast.
 */
const createMediaLibraryRole = async (
  page: Page,
  { name, canUpload }: { name: string; canUpload: boolean }
) => {
  await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
  await clickAndWait(page, page.getByRole('button', { name: 'Add new role' }).first());

  await page.getByRole('textbox', { name: 'Name' }).fill(name);
  await page
    .getByRole('textbox', { name: 'Description' })
    .fill('Automatically generated for CMS-434 upload-permission coverage');

  await page.getByRole('tab', { name: 'Plugins' }).click();
  // The upload plugin category is labelled "Media Library"; expand it.
  await clickAndWait(page, page.getByRole('button', { name: /Media Library/i }).first());

  // `read` -> "Access the Media Library": keep on so the user can view the library.
  await page.getByRole('checkbox', { name: 'Access the Media Library' }).check();

  // `assets.create` -> "Create (upload)".
  const uploadCheckbox = page.getByRole('checkbox', { name: 'Create (upload)' });
  if (canUpload) {
    await uploadCheckbox.check();
  } else {
    await uploadCheckbox.uncheck();
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));

  // Confirm the role now exists in the list.
  await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');
  await expect(page.getByRole('row', { name })).toBeVisible();
};

/**
 * Assign a single role to an existing admin user via the UI, removing the role they
 * were seeded with so their effective permissions equal exactly the new role.
 * Mirrors the proven pattern in settings/rbac/assign-role-to-user.spec.ts.
 */
const assignRoleToUser = async (
  page: Page,
  { userEmail, addRole, removeRole }: { userEmail: string; addRole: string; removeRole: string }
) => {
  await navToHeader(page, ['Settings', ['Administration Panel', 'Users']], 'Users');

  const userRow = page.getByRole('row', { name: new RegExp(userEmail, 'i') }).first();
  await clickAndWait(page, userRow.getByRole('link', { name: /^Edit/i }));

  await page.getByLabel("User's roles*").locator('svg').last().click();
  const listBox = page.getByRole('listbox');
  await listBox.getByLabel(addRole).locator('button').check();
  await listBox.getByLabel(removeRole, { exact: true }).locator('button').uncheck();
  await page.keyboard.press('Escape');

  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));

  // Confirm the assignment persisted before we log out and back in.
  await navToHeader(page, ['Settings', ['Administration Panel', 'Users']], 'Users');
  await expect(page.getByRole('row', { name: new RegExp(userEmail, 'i') }).first()).toContainText(
    addRole
  );
};

const logout = async (page: Page) => {
  await clickAndWait(page, page.getByRole('button', { name: ADMIN_DISPLAY_NAME }));
  await page.getByRole('menuitem', { name: /^Log(?:out| out)$/i }).click();
  await page.waitForURL('**/admin/auth/login');
};
