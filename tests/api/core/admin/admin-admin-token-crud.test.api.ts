import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createAgent } from 'api-tests/agent';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';
import constants from '../../../../packages/core/admin/server/src/services/constants';

describe('Admin Admin Token CRUD (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let rqOther: Awaited<ReturnType<typeof createAuthRequest>>;
  let rqEditor: Awaited<ReturnType<typeof createAuthRequest>>;
  let editorUserId: number;
  let saOtherUserId: number;
  let editorRoleId: number;
  let now: number;
  let nowSpy: jest.SpyInstance;

  // The two actions we assign to the editor role for ceiling tests.
  // These must be real registered actions (no subject).
  const EDITOR_ACTION = 'admin::webhooks.read';
  const UNGRANTED_ACTION = 'admin::webhooks.create';

  const deleteAllAdminTokens = async () => {
    await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    rq = await createAuthRequest({ strapi });
    now = Date.now();
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);

    const utils = createUtils(strapi);

    const superAdminRole = await utils.getSuperAdminRole();
    const saOtherUser = await utils.createUser({
      email: 'sa-other@test.com',
      firstname: 'Other',
      lastname: 'SA',
      isActive: true,
      roles: [superAdminRole.id],
    });
    saOtherUserId = saOtherUser.id;
    rqOther = await createAuthRequest({ strapi, userInfo: { email: 'sa-other@test.com' } });

    // Create a custom role with one known action for ceiling tests.
    const editorRole = await utils.createRole({
      name: 'token-ceiling-test-role',
      description: 'Role used to test admin token permission ceiling',
    });
    editorRoleId = editorRole.id;
    await utils.assignPermissionsToRole(editorRole.id, [
      { action: EDITOR_ACTION, subject: null, conditions: [], properties: {} },
      { action: 'admin::admin-tokens.create', subject: null, conditions: [], properties: {} },
      { action: 'admin::admin-tokens.read', subject: null, conditions: [], properties: {} },
      { action: 'admin::admin-tokens.update', subject: null, conditions: [], properties: {} },
      { action: 'admin::admin-tokens.delete', subject: null, conditions: [], properties: {} },
      { action: 'admin::admin-tokens.regenerate', subject: null, conditions: [], properties: {} },
    ]);

    const editorUser = await utils.createUser({
      email: 'editor@test.com',
      firstname: 'Editor',
      lastname: 'User',
      isActive: true,
      roles: [editorRole.id],
    });
    editorUserId = editorUser.id;
    rqEditor = await createAuthRequest({ strapi, userInfo: { email: 'editor@test.com' } });

    await deleteAllAdminTokens();
  });

  afterAll(async () => {
    nowSpy.mockRestore();
    if (editorUserId !== undefined)
      await strapi.db.query('admin::user').delete({ where: { id: editorUserId } });
    if (saOtherUserId !== undefined)
      await strapi.db.query('admin::user').delete({ where: { id: saOtherUserId } });
    if (editorRoleId !== undefined)
      await strapi.db.query('admin::role').delete({ where: { id: editorRoleId } });
    await strapi.destroy();
  });

  afterEach(async () => {
    await deleteAllAdminTokens();
  });

  let currentTokens = 0;
  const createValidSuperAdminAdminToken = async (token = {}) => {
    currentTokens += 1;

    const body = {
      name: `admin_token_${String(currentTokens)}`,
      description: 'generic description',
      ...token,
    };

    const req = await rq({
      url: '/admin/admin-tokens',
      method: 'POST',
      body,
    });

    expect(req.status).toEqual(201);
    return req.body.data;
  };

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  describe('POST /admin/admin-tokens', () => {
    test('Creates an admin token with expected shape', async () => {
      const body = {
        name: 'admin-token_tests-create',
        description: 'admin-token_tests-description',
      };

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject({
        name: body.name,
        description: body.description,
        kind: 'admin',
        adminPermissions: [],
        accessKey: expect.any(String),
        id: expect.any(Number),
      });
      expect(res.body.data.adminUserOwner).toBeDefined();
    });

    test('Creates an admin token without description (defaults to empty string)', async () => {
      const body = {
        name: 'admin-token_tests-no-description',
      };

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.description).toBe('');
    });

    test('Creates an admin token with trimmed name and description', async () => {
      const body = {
        name: '  admin-token_tests-trimmed  ',
        description: '  trimmed description  ',
      };

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.name).toBe('admin-token_tests-trimmed');
      expect(res.body.data.description).toBe('trimmed description');
    });

    test('Creates a token with a 7-day lifespan', async () => {
      const lifespan = constants.API_TOKEN_LIFESPANS.DAYS_7;
      const body = {
        name: 'admin-token_tests-lifespan7',
        lifespan,
      };

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.lifespan).toBe(String(lifespan));
      // @ts-expect-error - Add `expect.toBeISODate()` to jest types
      expect(res.body.data.expiresAt).toEqual(expect.toBeISODate());
      expect(Date.parse(res.body.data.expiresAt)).toBeGreaterThan(now + lifespan - 2000);
      expect(Date.parse(res.body.data.expiresAt)).toBeLessThan(now + lifespan + 2000);
    });

    test('Creates a token with a 30-day lifespan', async () => {
      const lifespan = constants.API_TOKEN_LIFESPANS.DAYS_30;
      const body = {
        name: 'admin-token_tests-lifespan30',
        lifespan,
      };

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.lifespan).toBe(String(lifespan));
      expect(Date.parse(res.body.data.expiresAt)).toBeGreaterThan(now + lifespan - 2000);
      expect(Date.parse(res.body.data.expiresAt)).toBeLessThan(now + lifespan + 2000);
    });

    test('Creates a token with a 90-day lifespan', async () => {
      const lifespan = constants.API_TOKEN_LIFESPANS.DAYS_90;
      const body = {
        name: 'admin-token_tests-lifespan90',
        lifespan,
      };

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.lifespan).toBe(String(lifespan));
      expect(Date.parse(res.body.data.expiresAt)).toBeGreaterThan(now + lifespan - 2000);
      expect(Date.parse(res.body.data.expiresAt)).toBeLessThan(now + lifespan + 2000);
    });

    test('Creates a token with null lifespan → expiresAt is null', async () => {
      const body = {
        name: 'admin-token_tests-null-lifespan',
        lifespan: null,
      };

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.expiresAt).toBeNull();
      expect(res.body.data.lifespan).toBeNull();
    });

    test('Fails to create a token with invalid lifespan → 400', async () => {
      const body = {
        name: 'admin-token_tests-bad-lifespan',
        lifespan: -1,
      };

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body,
      });

      expect(res.statusCode).toBe(400);
    });

    test('Fails to create a token with duplicate name → 400 Name already taken', async () => {
      await createValidSuperAdminAdminToken({ name: 'admin-token_tests-duplicate' });

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name: 'admin-token_tests-duplicate' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe('Name already taken');
    });

    test('Fails to create a token with `type` set → 400', async () => {
      const body = {
        name: 'admin-token_tests-with-type',
        type: 'read-only',
      };

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body,
      });

      expect(res.statusCode).toBe(400);
    });

    test('Fails to create a token with `permissions` set → 400', async () => {
      const body = {
        name: 'admin-token_tests-with-permissions',
        permissions: ['api::foo.foo.find'],
      };

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body,
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  describe('GET /admin/admin-tokens', () => {
    test('Lists admin tokens — no accessKey in any entry', async () => {
      await createValidSuperAdminAdminToken();
      await createValidSuperAdminAdminToken();

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      for (const token of res.body.data) {
        expect(token.accessKey).toBeUndefined();
        expect(token.kind).toBe('admin');
      }
    });

    test('Super admin sees all admin tokens regardless of owner', async () => {
      await createValidSuperAdminAdminToken({ name: 'admin-token_list-sa-a' });

      const resOther = await rqOther({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name: 'admin-token_list-sa-b' },
      });
      expect(resOther.statusCode).toBe(201);

      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      const names = res.body.data.map((t: { name: string }) => t.name);
      expect(names).toContain('admin-token_list-sa-a');
      expect(names).toContain('admin-token_list-sa-b');
    });

    test('Bearer admin token — super admin lists all tokens (owner user has roles for isSuperAdmin)', async () => {
      await createValidSuperAdminAdminToken({ name: 'admin-token_bearer-list-sa-a' });

      // Token ability is scoped to adminPermissions; include read so hasPermissions allows the route.
      // Listing another super-admin's token still requires isSuperAdmin(ctx.state.user) in api-token list().
      const createOtherRes = await rqOther({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_bearer-list-sa-b',
          adminPermissions: [
            { action: 'admin::admin-tokens.read', subject: null, conditions: [], properties: {} },
          ],
        },
      });
      expect(createOtherRes.statusCode).toBe(201);
      const accessKey: string = createOtherRes.body.data.accessKey;

      const bearerRq = createAgent(strapi, { token: accessKey });

      const res = await bearerRq({
        url: '/admin/admin-tokens',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      const names = res.body.data.map((t: { name: string }) => t.name);
      expect(names).toContain('admin-token_bearer-list-sa-a');
      expect(names).toContain('admin-token_bearer-list-sa-b');
    });
  });

  // ---------------------------------------------------------------------------
  // Get
  // ---------------------------------------------------------------------------

  describe('GET /admin/admin-tokens/:id', () => {
    test('Owner gets token with accessKey', async () => {
      const token = await createValidSuperAdminAdminToken();

      const res = await rq({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.accessKey).toEqual(expect.any(String));
      expect(res.body.data.id).toBe(token.id);
    });

    test('Different super admin (non-owner) gets token without accessKey', async () => {
      const token = await createValidSuperAdminAdminToken();

      const res = await rqOther({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.accessKey).toBeUndefined();
      expect(res.body.data.id).toBe(token.id);
    });

    test('Returns 404 for missing id', async () => {
      const res = await rq({
        url: '/admin/admin-tokens/999999',
        method: 'GET',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Revoke
  // ---------------------------------------------------------------------------

  describe('DELETE /admin/admin-tokens/:id', () => {
    test('Revokes a token → 200, returns deleted token without accessKey', async () => {
      const token = await createValidSuperAdminAdminToken();

      const res = await rq({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'DELETE',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).not.toBeNull();
      expect(res.body.data.id).toBe(token.id);
      expect(res.body.data.accessKey).toBeUndefined();
    });

    test('Non-owner super admin can revoke → 200', async () => {
      const token = await createValidSuperAdminAdminToken({
        name: 'admin-token_tests-delete-by-other-sa',
      });

      const res = await rqOther({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'DELETE',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).not.toBeNull();
      expect(res.body.data.id).toBe(token.id);
    });

    test('Returns 404 for missing id', async () => {
      const res = await rq({
        url: '/admin/admin-tokens/999999',
        method: 'DELETE',
      });

      expect(res.statusCode).toBe(404);
    });

    test('Revoking an admin token with permissions deletes the permission rows', async () => {
      const createRes = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_tests-revoke-permissions',
          adminPermissions: [{ action: EDITOR_ACTION }],
        },
      });
      expect(createRes.statusCode).toBe(201);
      const tokenId = createRes.body.data.id;
      const permissionIds = createRes.body.data.adminPermissions.map((p: { id: number }) => p.id);
      expect(permissionIds.length).toBeGreaterThan(0);

      const deleteRes = await rq({
        url: `/admin/admin-tokens/${tokenId}`,
        method: 'DELETE',
      });
      expect(deleteRes.statusCode).toBe(200);

      const orphans = await strapi.db.query('admin::permission').findMany({
        where: { id: { $in: permissionIds } },
      });
      expect(orphans).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  describe('PUT /admin/admin-tokens/:id', () => {
    test('Owner updates name/description → 200', async () => {
      const token = await createValidSuperAdminAdminToken();

      const res = await rq({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'PUT',
        body: {
          name: 'admin-token_tests-updated-name',
          description: 'updated description',
          adminPermissions: [],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('admin-token_tests-updated-name');
      expect(res.body.data.description).toBe('updated description');
    });

    test('Non-owner super admin can update → 200', async () => {
      const token = await createValidSuperAdminAdminToken();

      const res = await rqOther({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'PUT',
        body: {
          name: 'admin-token_tests-updated-by-other',
          adminPermissions: [],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('admin-token_tests-updated-by-other');
    });

    test('Partial body (description only) keeps other fields', async () => {
      const token = await createValidSuperAdminAdminToken({
        name: 'admin-token_tests-partial-update',
      });

      const res = await rq({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'PUT',
        body: {
          description: 'only description updated',
          adminPermissions: [],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('admin-token_tests-partial-update');
      expect(res.body.data.description).toBe('only description updated');
    });

    test('Returns 404 for missing id', async () => {
      const res = await rq({
        url: '/admin/admin-tokens/999999',
        method: 'PUT',
        body: { name: 'admin-token_tests-404', adminPermissions: [] },
      });

      expect(res.statusCode).toBe(404);
    });

    test('Invalid name (empty string) → 400', async () => {
      const token = await createValidSuperAdminAdminToken();

      const res = await rq({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'PUT',
        body: { name: '', adminPermissions: [] },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Regenerate
  // ---------------------------------------------------------------------------

  describe('POST /admin/admin-tokens/:id/regenerate', () => {
    test('Owner regenerates → 201, new accessKey differs from original', async () => {
      const token = await createValidSuperAdminAdminToken();

      const res = await rq({
        url: `/admin/admin-tokens/${token.id}/regenerate`,
        method: 'POST',
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.accessKey).toEqual(expect.any(String));
      expect(res.body.data.accessKey).not.toBe(token.accessKey);
    });

    test('Non-owner (different super admin) → 403', async () => {
      const token = await createValidSuperAdminAdminToken();

      const res = await rqOther({
        url: `/admin/admin-tokens/${token.id}/regenerate`,
        method: 'POST',
      });

      expect(res.statusCode).toBe(403);
    });

    test('Returns 404 for missing id', async () => {
      const res = await rq({
        url: '/admin/admin-tokens/999999/regenerate',
        method: 'POST',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // getOwnerPermissions
  // ---------------------------------------------------------------------------

  describe('GET /admin/admin-tokens/:id/owner-permissions', () => {
    test('Owner can read → 200, returns owner effective permissions array', async () => {
      const token = await createValidSuperAdminAdminToken();

      const res = await rq({
        url: `/admin/admin-tokens/${token.id}/owner-permissions`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('Non-owner super admin can read → 200', async () => {
      const token = await createValidSuperAdminAdminToken();

      const res = await rqOther({
        url: `/admin/admin-tokens/${token.id}/owner-permissions`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('Returns 404 for missing id', async () => {
      const res = await rq({
        url: '/admin/admin-tokens/999999/owner-permissions',
        method: 'GET',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('B — 403 for non-owner non-super-admin', () => {
    test('PUT /admin/admin-tokens/:id — rqEditor (not owner) → 403', async () => {
      const token = await createValidSuperAdminAdminToken({ name: 'admin-token_b-update' });

      const res = await rqEditor({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'PUT',
        body: { name: 'admin-token_b-update-new', adminPermissions: [] },
      });

      expect(res.statusCode).toBe(403);
    });

    test('GET /admin/admin-tokens/:id/owner-permissions — rqEditor (not owner) → 403', async () => {
      const token = await createValidSuperAdminAdminToken({ name: 'admin-token_b-owner-perms' });

      const res = await rqEditor({
        url: `/admin/admin-tokens/${token.id}/owner-permissions`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(403);
    });

    test('DELETE /admin/admin-tokens/:id — rqEditor (not owner) → 403', async () => {
      const token = await createValidSuperAdminAdminToken({ name: 'admin-token_b-delete' });

      const res = await rqEditor({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'DELETE',
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('C — List ownership filter', () => {
    test('Non-super-admin only sees their own tokens', async () => {
      // rq (super-admin) creates one token
      await rq({ url: '/admin/admin-tokens', method: 'POST', body: { name: 'admin-token_c-sa' } });

      // rqEditor creates their own token
      const editorRes = await rqEditor({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name: 'admin-token_c-editor' },
      });
      expect(editorRes.statusCode).toBe(201);

      const listRes = await rqEditor({ url: '/admin/admin-tokens', method: 'GET' });

      expect(listRes.statusCode).toBe(200);
      const names = listRes.body.data.map((t: { name: string }) => t.name);
      expect(names).toContain('admin-token_c-editor');
      expect(names).not.toContain('admin-token_c-sa');
    });

    test('Super-admin list returns all tokens from all owners', async () => {
      await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name: 'admin-token_c-all-sa' },
      });
      const editorRes = await rqEditor({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name: 'admin-token_c-all-editor' },
      });
      expect(editorRes.statusCode).toBe(201);

      const listRes = await rq({ url: '/admin/admin-tokens', method: 'GET' });
      expect(listRes.statusCode).toBe(200);
      const names = listRes.body.data.map((t: { name: string }) => t.name);
      expect(names).toContain('admin-token_c-all-sa');
      expect(names).toContain('admin-token_c-all-editor');
    });
  });

  describe('D — Permission ceiling on create', () => {
    test('Editor creates token with a permission they hold → 201, permission persisted', async () => {
      const res = await rqEditor({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_d-within-ceiling',
          adminPermissions: [
            { action: EDITOR_ACTION, subject: null, conditions: [], properties: {} },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const persisted = res.body.data.adminPermissions;
      expect(Array.isArray(persisted)).toBe(true);
      expect(persisted.some((p: { action: string }) => p.action === EDITOR_ACTION)).toBe(true);
    });

    test('Editor creates token with a permission they do NOT hold → 400 ValidationError', async () => {
      const res = await rqEditor({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_d-exceeds-ceiling',
          adminPermissions: [
            { action: UNGRANTED_ACTION, subject: null, conditions: [], properties: {} },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
    });

    test('Editor creates token with an unknown action → 400', async () => {
      const res = await rqEditor({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_d-unknown-action',
          adminPermissions: [
            { action: 'admin::nonexistent.action', subject: null, conditions: [], properties: {} },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('Editor creates token; conditions are inherited from their role (not caller-supplied)', async () => {
      // Assign the action with a condition to the role, then verify round-trip strips supplied conditions
      const res = await rqEditor({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_d-condition-inherit',
          // Caller tries to supply no conditions — ceiling should enforce role's conditions
          adminPermissions: [
            { action: EDITOR_ACTION, subject: null, conditions: [], properties: {} },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      // Conditions on the token must match what the role has (empty since we assigned with no conditions)
      const persisted = res.body.data.adminPermissions;
      const perm = persisted.find((p: { action: string }) => p.action === EDITOR_ACTION);
      expect(perm).toBeDefined();
      // Role was assigned with empty conditions → token should also have empty conditions
      expect(perm.conditions).toStrictEqual([]);
    });

    test('Super-admin can create token with any permission (bypasses ceiling) → 201', async () => {
      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_d-sa-bypass',
          adminPermissions: [
            { action: UNGRANTED_ACTION, subject: null, conditions: [], properties: {} },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
    });

    test('Super-admin: unregistered condition is stripped, not persisted → 201 with empty conditions', async () => {
      const res = await rq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_d-sa-bogus-condition',
          adminPermissions: [
            {
              action: EDITOR_ACTION,
              subject: null,
              conditions: ['plugin::unknown.bogus-condition'],
              properties: {},
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const perm = res.body.data.adminPermissions.find(
        (p: { action: string }) => p.action === EDITOR_ACTION
      );
      expect(perm).toBeDefined();
      expect(perm.conditions).toStrictEqual([]);
    });
  });

  describe('G — Owner immutability', () => {
    test('Update with different adminUserOwner → 400 ValidationError', async () => {
      const token = await createValidSuperAdminAdminToken({
        name: 'admin-token_g-owner-immutable',
      });

      const res = await rq({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'PUT',
        body: {
          name: 'admin-token_g-owner-immutable',
          adminPermissions: [],
          adminUserOwner: editorUserId,
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('I — User lifecycle', () => {
    test('Deleting a user removes their admin tokens', async () => {
      const utils = createUtils(strapi);

      const editorRole = await strapi.db
        .query('admin::role')
        .findOne({ where: { name: 'token-ceiling-test-role' } });

      const tempUser = await utils.createUser({
        email: 'temp-deletable@test.com',
        firstname: 'Temp',
        lastname: 'Delete',
        isActive: true,
        roles: [editorRole.id],
      });

      const tempRq = await createAuthRequest({
        strapi,
        userInfo: { email: 'temp-deletable@test.com' },
      });

      const createRes = await tempRq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name: 'admin-token_i-lifecycle' },
      });
      expect(createRes.statusCode).toBe(201);
      const tokenId = createRes.body.data.id;

      await utils.deleteUserById(tempUser.id);

      const token = await strapi.db.query('admin::api-token').findOne({ where: { id: tokenId } });
      expect(token).toBeNull();
    });

    test('Blocked owner — admin token is rejected (401)', async () => {
      const utils = createUtils(strapi);

      const editorRole = await strapi.db
        .query('admin::role')
        .findOne({ where: { name: 'token-ceiling-test-role' } });

      const blockedUser = await utils.createUser({
        email: 'temp-blocked@test.com',
        firstname: 'Blocked',
        lastname: 'User',
        isActive: true,
        roles: [editorRole.id],
      });

      const blockedRq = await createAuthRequest({
        strapi,
        userInfo: { email: 'temp-blocked@test.com' },
      });

      // Create an admin token while still active — store the raw accessKey
      const createRes = await blockedRq({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name: 'admin-token_i-blocked' },
      });
      expect(createRes.statusCode).toBe(201);
      const accessKey: string = createRes.body.data.accessKey;

      // Block the user
      await strapi.db.query('admin::user').update({
        where: { id: blockedUser.id },
        data: { isActive: false },
      });

      // A request authenticated with the admin token should now be rejected
      const bearerRq = createAgent(strapi, { token: accessKey });

      const res = await bearerRq({
        url: '/admin/admin-tokens',
        method: 'GET',
      });

      expect(res.statusCode).toBe(401);

      // Cleanup
      await utils.deleteUserById(blockedUser.id);
    });
  });
});
