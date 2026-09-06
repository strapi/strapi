import { test, expect, type APIRequestContext } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { navToHeader } from '../../../../utils/shared';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../../constants';

// Critical path #13 — permissions.users-permissions.role-matrix
//
// This is primarily an API-layer guarantee (the end-user Users & Permissions roles, NOT admin RBAC),
// so the matrix is configured and asserted via the content/admin API. A thin UI smoke confirms the
// U&P Roles settings page itself renders. Per the coverage matrix this lives in tests/e2e/tests/settings.
//
// NOTE: the e2e DB reset only covers ALLOWED_CONTENT_TYPES, which excludes U&P users/roles/permissions.
// So U&P state is NOT reset between tests/browsers. The test is therefore fully self-contained: it sets
// the exact permission state it needs (rather than assuming a pristine baseline) and registers with a
// unique per-run email so it never collides with a user left behind by an earlier run.
test.describe('U&P - role matrix', { tag: ['@critical'] }, () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  /**
   * Set a set of actions on the `article` controller for a U&P role to enabled/disabled, via the
   * admin API. Fetches the role's current permission tree, flips the requested actions, and PUTs it
   * back otherwise unchanged — mirroring the Roles edit page. Self-adapting to the tree's top-level
   * group key (e.g. `api::article`) so it doesn't hardcode internal shape.
   */
  const setArticleActions = async (
    request: APIRequestContext,
    headers: Record<string, string>,
    roleId: number,
    actions: string[],
    enabled: boolean
  ) => {
    const res = await request.get(`/users-permissions/roles/${roleId}`, { headers });
    expect(res.ok(), 'fetching the U&P role failed').toBeTruthy();
    const { role } = await res.json();

    let touched = false;
    for (const group of Object.values<any>(role.permissions)) {
      if (group?.controllers?.article) {
        for (const action of actions) {
          expect(
            group.controllers.article[action],
            `article controller has no "${action}" action`
          ).toBeTruthy();
          group.controllers.article[action].enabled = enabled;
        }
        touched = true;
      }
    }
    expect(touched, 'article controller not found in the role permission tree').toBeTruthy();

    const put = await request.put(`/users-permissions/roles/${roleId}`, {
      headers,
      data: {
        name: role.name,
        description: role.description,
        type: role.type,
        permissions: role.permissions,
      },
    });
    expect(put.ok(), 'updating the U&P role failed').toBeTruthy();
  };

  test('public role can read and authenticated role can create via the content API', async ({
    page,
  }, testInfo) => {
    // --- UI smoke: the Users & Permissions Roles settings page renders the built-in roles ---
    await navToHeader(page, ['Settings', ['Users & Permissions plugin', 'Roles']], 'Roles');
    await expect(page.getByRole('gridcell', { name: 'Authenticated', exact: true })).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'Public', exact: true })).toBeVisible();

    // --- Admin API token (configures the matrix; mirrors admin-tokens.spec.ts) ---
    const adminLogin = await page.request.post('/admin/login', {
      data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
    });
    const adminToken = (await adminLogin.json()).data?.token;
    expect(adminToken, 'admin API login failed').toBeTruthy();
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const rolesRes = await page.request.get('/users-permissions/roles', { headers: adminHeaders });
    const { roles } = await rolesRes.json();
    const publicRole = roles.find((r: any) => r.type === 'public');
    const authRole = roles.find((r: any) => r.type === 'authenticated');
    expect(publicRole, 'public role not found').toBeTruthy();
    expect(authRole, 'authenticated role not found').toBeTruthy();

    // --- Public role READ: prove the gate both ways (deterministic, no pristine-state assumption) ---
    await setArticleActions(page.request, adminHeaders, publicRole.id, ['find', 'findOne'], false);
    const forbidden = await page.request.get('/api/articles');
    expect(forbidden.status(), 'public read should be forbidden without find').toBe(403);

    await setArticleActions(page.request, adminHeaders, publicRole.id, ['find', 'findOne'], true);
    const allowed = await page.request.get('/api/articles');
    expect(allowed.status(), 'public read should be allowed once find is granted').toBe(200);

    // --- Authenticated role CREATE ---
    await setArticleActions(page.request, adminHeaders, authRole.id, ['create'], true);

    // Register an end-user. The fixture has allow_register=true, email_confirmation=false and
    // default_role=authenticated, so this returns a usable JWT for an Authenticated-role user.
    // Unique per-run identity: U&P users are never reset, so a fixed email would collide on reruns.
    const tag = `${testInfo.project.name}_${Date.now()}`;
    const register = await page.request.post('/api/auth/local/register', {
      data: {
        username: `e2e_role_matrix_${tag}`,
        email: `e2e_role_matrix_${tag}@testing.com`,
        password: 'Testing123!',
      },
    });
    expect(register.ok(), 'end-user registration failed').toBeTruthy();
    const userJwt = (await register.json()).jwt;
    expect(userJwt, 'no JWT returned from registration').toBeTruthy();

    const created = await page.request.post('/api/articles', {
      headers: { Authorization: `Bearer ${userJwt}` },
      data: { data: { title: 'Created by an authenticated end-user' } },
    });
    expect(created.status(), 'authenticated create should succeed').toBe(201);
  });
});
