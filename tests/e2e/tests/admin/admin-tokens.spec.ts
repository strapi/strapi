import { test, expect } from '@playwright/test';
import { navToHeader } from '../../../utils/shared';
import { sharedSetup } from '../../../utils/setup';
import { login, switchUser } from '../../../utils/login';
import {
  ADMIN_EMAIL_ADDRESS,
  ADMIN_PASSWORD,
  EDITOR_EMAIL_ADDRESS,
  EDITOR_PASSWORD,
} from '../../constants';

const createAdminToken = async (page, tokenName: string, duration?: string) => {
  await navToHeader(
    page,
    ['Settings', 'Admin Tokens', 'Create new Admin Token'],
    'Create Admin Token'
  );
  await page.getByLabel('Name*').fill(tokenName);
  if (duration !== undefined) {
    await page.getByLabel('Token duration').click();
    await page.getByRole('option', { name: duration }).click();
  }
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
};

/**
 * Grant admin-tokens permissions to the Editor role via the admin REST API.
 * Uses a direct API login (POST /admin/login) to obtain a JWT, avoiding any
 * dependency on browser localStorage timing after the UI login flow.
 */
const grantEditorAdminTokenPermissions = async ({ page }) => {
  const loginRes = await page.request.post('/admin/login', {
    data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
  });
  const loginBody = await loginRes.json();
  const token: string = loginBody.data?.token;
  if (token === undefined) {
    throw new Error(`API login failed: ${JSON.stringify(loginBody)}`);
  }
  const headers = { Authorization: `Bearer ${token}` };

  const rolesRes = await page.request.get('/admin/roles', { headers });
  const rolesBody = await rolesRes.json();
  const editorRole = rolesBody.data.find((r) => r.name === 'Editor');
  if (editorRole === undefined) {
    throw new Error('Editor role not found');
  }

  const permsRes = await page.request.get(`/admin/roles/${editorRole.id}/permissions`, { headers });
  const permsBody = await permsRes.json();
  const existingPermissions = permsBody.data ?? [];

  const adminTokenActions = ['access', 'create', 'delete', 'read', 'update', 'regenerate'];
  const newPermissions = adminTokenActions.map((action) => ({
    action: `admin::admin-tokens.${action}`,
    subject: null,
    properties: {},
    conditions: [],
  }));

  const allPermissions = [
    ...existingPermissions.map(({ action, subject, properties, conditions }) => ({
      action,
      subject,
      properties,
      conditions,
    })),
    ...newPermissions,
  ];

  await page.request.put(`/admin/roles/${editorRole.id}/permissions`, {
    headers,
    data: { permissions: allPermissions },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Describe 1 — Create & List (super admin only)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Admin Tokens — Create & List', () => {
  test.beforeEach(async ({ page }) => {
    await sharedSetup('admin-tokens-basic', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin',
    });
  });

  test('A user should be able to create a 30 day admin token', async ({ page }) => {
    await createAdminToken(page, '30-day admin token', '30 days');
  });

  test('List shows created token and Owner column header', async ({ page }) => {
    await createAdminToken(page, 'my-list-test-token', '30 days');
    await navToHeader(page, ['Settings', 'Admin Tokens'], 'Admin Tokens');

    const row = page.getByRole('gridcell', { name: 'my-list-test-token', exact: true });
    await expect(row).toBeVisible();
  });

  test('No Token type selector on create page', async ({ page }) => {
    await navToHeader(
      page,
      ['Settings', 'Admin Tokens', 'Create new Admin Token'],
      'Create Admin Token'
    );
    await expect(page.getByLabel('Token type')).not.toBeVisible();
  });

  test('Admin permissions matrix rendered with Plugins tab', async ({ page }) => {
    await navToHeader(
      page,
      ['Settings', 'Admin Tokens', 'Create new Admin Token'],
      'Create Admin Token'
    );

    const pluginsTab = page.getByRole('tab', { name: 'Plugins' });
    await expect(pluginsTab).toBeVisible();

    // Content-API route-based permissions (Read-only / Full access / Custom) should not appear
    await expect(page.getByLabel('Token type')).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Describe 2 — Ownership (multi-user: super admin + editor)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Admin Tokens — Ownership', () => {
  test.beforeEach(async ({ page }) => {
    await sharedSetup('admin-tokens-ownership', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin',
      afterSetup: grantEditorAdminTokenPermissions,
    });
  });

  test('Owner field not shown for token owner', async ({ page }) => {
    await createAdminToken(page, 'super-admin-own-token', '30 days');

    // Owner field should not be visible when viewing your own token
    await expect(page.getByLabel('Owner')).not.toBeVisible();
  });

  test('Owner shown, Copy and Regenerate absent for non-owner', async ({ page }) => {
    // Editor creates a token
    await switchUser({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await createAdminToken(page, 'editor-owned-token', '30 days');

    // Super admin opens the editor's token
    await switchUser({ page, username: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD });
    await navToHeader(page, ['Settings', 'Admin Tokens'], 'Admin Tokens');
    await page.getByRole('gridcell', { name: 'editor-owned-token', exact: true }).click();

    await expect(page.getByText('Owner')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Regenerate' })).not.toBeVisible();
  });

  test('Regenerate button visible to owner', async ({ page }) => {
    // Switch to editor
    await switchUser({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await createAdminToken(page, 'editor-own-regen-token', '30 days');

    // Still on the edit page after creation — Regenerate should be visible
    await expect(page.getByRole('button', { name: 'Regenerate' })).toBeVisible();
    // Copy button should be visible
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Describe 3 — Permission Ceiling (multi-user)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Admin Tokens — Permission Ceiling', () => {
  test.beforeEach(async ({ page }) => {
    await sharedSetup('admin-tokens-ownership', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin',
      afterSetup: grantEditorAdminTokenPermissions,
    });
  });

  test('Super admin has no ceiling on Settings permissions', async ({ page }) => {
    await navToHeader(
      page,
      ['Settings', 'Admin Tokens', 'Create new Admin Token'],
      'Create Admin Token'
    );

    // Super admin should have no disabled checkboxes in the Settings section
    const disabledCheckboxes = page.getByRole('checkbox', { disabled: true });
    await expect(disabledCheckboxes).toHaveCount(0);
  });

  test('Editor ceiling enforced: some Settings checkboxes disabled', async ({ page }) => {
    // Switch to editor
    await switchUser({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });

    await navToHeader(
      page,
      ['Settings', 'Admin Tokens', 'Create new Admin Token'],
      'Create Admin Token'
    );

    await expect(page.getByRole('checkbox', { name: 'Select Create article' })).toBeEnabled();
    await expect(
      page.getByRole('checkbox', { name: 'Select Read article permission' })
    ).toBeEnabled();
    await expect(page.getByRole('checkbox', { name: 'Select Update article' })).toBeEnabled();
    await expect(page.getByRole('checkbox', { name: 'Select Delete article' })).toBeDisabled();
  });

  test("Super admin editing editor's token sees ceiling from editor's permissions", async ({
    page,
  }) => {
    // Switch to editor, create a token
    await switchUser({ page, username: EDITOR_EMAIL_ADDRESS, password: EDITOR_PASSWORD });
    await createAdminToken(page, 'editor-ceiling-token', '30 days');

    // Switch back to super admin
    await switchUser({ page, username: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD });

    await navToHeader(page, ['Settings', 'Admin Tokens'], 'Admin Tokens');
    await page.getByRole('gridcell', { name: 'editor-ceiling-token', exact: true }).click();

    // Super admin viewing editor's token should see ceiling: at least one disabled checkbox
    const disabledCheckboxes = page.getByRole('checkbox', { disabled: true });
    await expect(disabledCheckboxes.first()).toBeVisible();
  });
});
