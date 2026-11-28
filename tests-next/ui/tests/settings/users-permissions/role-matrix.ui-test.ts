import type { APIRequestContext } from '@playwright/test';

import { accessToken, expect, test } from '../../../fixtures';
import { UsersPermissionsRolesPage } from '../../../pages';

// Critical path #13 — permissions.users-permissions.role-matrix
//
// This is primarily an API-layer guarantee (the end-user Users & Permissions roles, NOT admin
// RBAC), so the matrix is configured and asserted via the content/admin API. A thin UI smoke
// confirms the U&P Roles settings page itself renders.
//
// The file's reset restores the U&P roles too, so the test starts from the app's defaults. It
// still sets the exact permission state it needs rather than assuming them.
test.describe('U&P - role matrix', { tag: ['@critical'] }, () => {
  /**
   * Set a set of actions on the `article` controller for a U&P role to enabled/disabled, via the
   * admin API. Fetches the role's current permission tree, flips the requested actions, and PUTs
   * it back otherwise unchanged — mirroring the Roles edit page. Self-adapting to the tree's
   * top-level group key (e.g. `api::article`) so it doesn't hardcode internal shape.
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
    type ArticleGroup = {
      controllers?: { article?: Record<string, { enabled: boolean }> };
    };
    for (const group of Object.values<ArticleGroup>(role.permissions)) {
      const article = group?.controllers?.article;
      if (article) {
        for (const action of actions) {
          expect(article[action], `article controller has no "${action}" action`).toBeTruthy();
          article[action].enabled = enabled;
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
    storageStates,
    unique,
  }) => {
    // --- UI smoke: the Users & Permissions Roles settings page renders the built-in roles ---
    const roles = new UsersPermissionsRolesPage(page);

    await page.goto('/admin');
    await roles.open();
    await expect(roles.role('Authenticated')).toBeVisible();
    await expect(roles.role('Public')).toBeVisible();

    // --- Admin API token (configures the matrix): the Super Admin's, from its storage state ---
    const adminHeaders = { Authorization: `Bearer ${accessToken(storageStates.admin)}` };

    type UpRole = { id: number; type: string };
    const rolesRes = await page.request.get('/users-permissions/roles', { headers: adminHeaders });
    const { roles: upRoles } = (await rolesRes.json()) as { roles: UpRole[] };
    const publicRole = upRoles.find((r) => r.type === 'public');
    const authRole = upRoles.find((r) => r.type === 'authenticated');
    expect(publicRole, 'public role not found').toBeTruthy();
    expect(authRole, 'authenticated role not found').toBeTruthy();

    // --- Public role READ: prove the gate both ways ---
    await setArticleActions(page.request, adminHeaders, publicRole!.id, ['find', 'findOne'], false);
    const forbidden = await page.request.get('/api/articles');
    expect(forbidden.status(), 'public read should be forbidden without find').toBe(403);

    await setArticleActions(page.request, adminHeaders, publicRole!.id, ['find', 'findOne'], true);
    const allowed = await page.request.get('/api/articles');
    expect(allowed.status(), 'public read should be allowed once find is granted').toBe(200);

    // --- Authenticated role CREATE ---
    await setArticleActions(page.request, adminHeaders, authRole!.id, ['create'], true);

    // Register an end-user. The app's defaults are allow_register=true, email_confirmation=false
    // and default_role=authenticated, so this returns a usable JWT for an Authenticated-role
    // user. `unique`: the test can run again before the next reset (`--repeat-each`).
    const username = unique('e2e_role_matrix');
    const register = await page.request.post('/api/auth/local/register', {
      data: { username, email: `${username}@testing.com`, password: 'Testing123!' },
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
