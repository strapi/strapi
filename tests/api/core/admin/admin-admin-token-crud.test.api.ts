import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
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
    rqOther = await createAuthRequest({
      strapi,
      userInfo: {
        email: 'sa-other@test.com',
        firstname: 'Other',
        lastname: 'SA',
        password: 'Password123',
      },
    });

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
    rqEditor = await createAuthRequest({
      strapi,
      userInfo: {
        email: 'editor@test.com',
        firstname: 'Editor',
        lastname: 'User',
        password: 'Password123',
      },
    });

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
  const expectAdminTokenOwnerDto = (owner: Record<string, unknown>) => {
    expect(owner).toBeDefined();
    expect(owner.id).toEqual(expect.any(Number));
    expect(owner.email).toEqual(expect.any(String));
    expect(owner.firstname).toEqual(expect.any(String));
    expect(owner.lastname).toEqual(expect.any(String));
    expect(owner.isActive).toBeUndefined();
    expect(owner.blocked).toBeUndefined();
    expect(owner.roles).toBeUndefined();
    expect(owner.password).toBeUndefined();
    expect(owner.resetPasswordToken).toBeUndefined();
    expect(owner.registrationToken).toBeUndefined();
  };

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
      expectAdminTokenOwnerDto(res.body.data.adminUserOwner);
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
        expectAdminTokenOwnerDto(token.adminUserOwner);
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
      expectAdminTokenOwnerDto(res.body.data.adminUserOwner);
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
      expectAdminTokenOwnerDto(res.body.data.adminUserOwner);
    });

    test('Editor with read permission gets 404 for another user token by id', async () => {
      const token = await createValidSuperAdminAdminToken({
        name: 'admin-token_get-editor-forbidden',
      });

      const res = await rqEditor({
        url: `/admin/admin-tokens/${token.id}`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(404);
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
      expectAdminTokenOwnerDto(res.body.data.adminUserOwner);
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
      expectAdminTokenOwnerDto(res.body.data.adminUserOwner);
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
      expectAdminTokenOwnerDto(res.body.data.adminUserOwner);
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
      expectAdminTokenOwnerDto(res.body.data.adminUserOwner);
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
      expectAdminTokenOwnerDto(res.body.data.adminUserOwner);
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

  /**
   * Token permissions follow the same per-permission rule as roles: a requested permission must
   * be covered, field by locale, by one owner permission, and its conditions are inherited from
   * that rule. The owner holds `username` on `en` unconditionally and `email` on `fr` only for
   * entries they created.
   */
  describe('D2 — Owner locales on a type that is not localized', () => {
    // Per-permission locale rules on a localized type: permission-ceiling-localized.test.api.ts
    const READ_ACTION = 'plugin::content-manager.explorer.read';
    const SUBJECT = 'plugin::users-permissions.user';

    let localeRoleId: number;
    let localeUserId: number;
    let rqLocale: Awaited<ReturnType<typeof createAuthRequest>>;

    const read = (properties: Record<string, unknown>) => ({
      action: READ_ACTION,
      subject: SUBJECT,
      properties,
      conditions: [],
    });

    beforeAll(async () => {
      const utils = createUtils(strapi);

      // Stale locales, as left after the localization of a type is turned off: the engine
      // ignores them on a type that is not localized
      const localeRole = await utils.createRole({
        name: 'token-locale-ceiling-test-role',
        description: 'Holds locales on a type that is not localized',
      });
      localeRoleId = localeRole.id;

      await utils.assignPermissionsToRole(localeRole.id, [
        { action: 'admin::admin-tokens.create', subject: null, conditions: [], properties: {} },
        { action: 'admin::admin-tokens.read', subject: null, conditions: [], properties: {} },
        read({ fields: ['username'], locales: ['en'] }),
      ]);

      const localeUser = await utils.createUser({
        email: 'token-locale-ceiling@test.com',
        firstname: 'Locale',
        lastname: 'Ceiling',
        isActive: true,
        roles: [localeRole.id],
      });
      localeUserId = localeUser.id;

      rqLocale = await createAuthRequest({
        strapi,
        userInfo: {
          email: 'token-locale-ceiling@test.com',
          firstname: 'Locale',
          lastname: 'Ceiling',
          password: 'Password123',
        },
      });
    });

    afterAll(async () => {
      if (localeUserId !== undefined)
        await strapi.db.query('admin::user').delete({ where: { id: localeUserId } });
      if (localeRoleId !== undefined)
        await strapi.db.query('admin::role').delete({ where: { id: localeRoleId } });
    });

    test('Omitted locales against owner locales the engine ignores → 201, kept as sent', async () => {
      const res = await rqLocale({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_d2-no-locales',
          adminPermissions: [read({ fields: ['username'] })],
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.adminPermissions).toMatchObject([read({ fields: ['username'] })]);
      expect(res.body.data.adminPermissions[0].properties).not.toHaveProperty('locales');

      // The owner's next re-clamp keeps it
      await (
        strapi.service('admin::api-token-admin') as {
          syncPermissionsForUser(id: number): Promise<void>;
        }
      ).syncPermissionsForUser(localeUserId);

      const rows = await strapi.db
        .query('admin::permission')
        .findMany({ where: { apiToken: { id: res.body.data.id } } });
      expect(rows).toHaveLength(1);
    });
  });

  describe('D3 — Owner permission under an unregistered condition', () => {
    const READ_ACTION = 'plugin::content-manager.explorer.read';
    const SUBJECT = 'plugin::users-permissions.user';
    const TOKEN_NAME = 'admin-token_d3-unknown-condition';

    let conditionRoleId: number;
    let conditionUserId: number;
    let rqCondition: Awaited<ReturnType<typeof createAuthRequest>>;

    beforeAll(async () => {
      const utils = createUtils(strapi);

      // The owner's only read on SUBJECT is under a condition the engine does not know
      const conditionRole = await utils.createRole({
        name: 'token-unknown-condition-test-role',
        description: 'Holds a permission only under an unregistered condition',
      });
      conditionRoleId = conditionRole.id;

      await utils.assignPermissionsToRole(conditionRole.id, [
        { action: 'admin::admin-tokens.create', subject: null, conditions: [], properties: {} },
        { action: 'admin::admin-tokens.read', subject: null, conditions: [], properties: {} },
      ]);

      // Inserted directly: saving through the API strips unregistered conditions
      await strapi.db.query('admin::permission').create({
        data: {
          action: READ_ACTION,
          subject: SUBJECT,
          properties: { fields: ['username'] },
          conditions: ['admin::does-not-exist'],
          actionParameters: {},
          role: conditionRole.id,
        },
      });

      const conditionUser = await utils.createUser({
        email: 'token-unknown-condition@test.com',
        firstname: 'Unknown',
        lastname: 'Condition',
        isActive: true,
        roles: [conditionRole.id],
      });
      conditionUserId = conditionUser.id;

      rqCondition = await createAuthRequest({
        strapi,
        userInfo: {
          email: 'token-unknown-condition@test.com',
          firstname: 'Unknown',
          lastname: 'Condition',
          password: 'Password123',
        },
      });
    });

    afterAll(async () => {
      if (conditionUserId !== undefined)
        await strapi.db.query('admin::user').delete({ where: { id: conditionUserId } });
      if (conditionRoleId !== undefined) {
        await strapi.db.query('admin::permission').deleteMany({
          where: { role: { id: conditionRoleId } },
        });
        await strapi.db.query('admin::role').delete({ where: { id: conditionRoleId } });
      }
    });

    test('A permission held only under an unregistered condition → 400, no token', async () => {
      const res = await rqCondition({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: TOKEN_NAME,
          adminPermissions: [
            {
              action: READ_ACTION,
              subject: SUBJECT,
              properties: { fields: ['username'] },
              conditions: ['admin::does-not-exist'],
            },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toContain(
        'Cannot assign admin permissions that exceed your own'
      );

      const tokens = await strapi.db
        .query('admin::api-token')
        .findMany({ where: { name: TOKEN_NAME } });
      expect(tokens).toHaveLength(0);
    });
  });

  /**
   * A request made with an admin token acts as its owner, but cannot grant more than the token
   * itself holds: the same two ceilings as a role update (the token, and the owner unless they
   * are a super admin). Conditions are inherited from both.
   */
  describe('E — Permission ceiling with a token-authenticated request', () => {
    const READ_ACTION = 'plugin::content-manager.explorer.read';
    const SUBJECT = 'plugin::users-permissions.user';
    const IS_CREATOR = 'admin::is-creator';

    const TOKEN_ACTIONS = ['admin::admin-tokens.create', 'admin::admin-tokens.update'];
    const tokenActions = TOKEN_ACTIONS.map((action) => ({
      action,
      subject: null,
      conditions: [],
      properties: {},
    }));
    const read = (fields: string[]) => ({
      action: READ_ACTION,
      subject: SUBJECT,
      properties: { fields },
      conditions: [],
    });

    let ownerRoleId: number;
    let ownerUserId: number;
    let rqOwner: Awaited<ReturnType<typeof createAuthRequest>>;

    beforeAll(async () => {
      const utils = createUtils(strapi);

      const ownerRole = await utils.createRole({
        name: 'admin-token_e-owner-role',
        description: 'Owns admin tokens that create and update admin tokens',
      });
      ownerRoleId = ownerRole.id;

      await utils.assignPermissionsToRole(ownerRole.id, [
        ...tokenActions,
        { action: 'admin::admin-tokens.read', subject: null, conditions: [], properties: {} },
        read(['username', 'email']),
      ]);

      const ownerUser = await utils.createUser({
        email: 'admin-token_e-owner@test.com',
        firstname: 'Token',
        lastname: 'CeilingOwner',
        isActive: true,
        roles: [ownerRole.id],
      });
      ownerUserId = ownerUser.id;

      rqOwner = await createAuthRequest({
        strapi,
        userInfo: {
          email: 'admin-token_e-owner@test.com',
          firstname: 'Token',
          lastname: 'CeilingOwner',
          password: 'Password123',
        },
      });
    });

    afterAll(async () => {
      if (ownerUserId !== undefined)
        await strapi.db.query('admin::user').delete({ where: { id: ownerUserId } });
      if (ownerRoleId !== undefined)
        await strapi.db.query('admin::role').delete({ where: { id: ownerRoleId } });
    });

    /** Mints a token as `rqMinter` and returns it with a request authenticated by it. */
    const mintToken = async (
      rqMinter: Awaited<ReturnType<typeof createAuthRequest>>,
      name: string,
      adminPermissions: object[]
    ) => {
      const res = await rqMinter({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name, adminPermissions },
      });

      expect(res.statusCode).toBe(201);

      return {
        token: res.body.data,
        rqToken: createRequest({ strapi }).setToken(res.body.data.accessKey),
      };
    };

    const findTokensByName = (name: string) =>
      strapi.db.query('admin::api-token').findMany({ where: { name } });

    const findReadPermissions = async (tokenId: number) =>
      (
        await strapi.db
          .query('admin::permission')
          .findMany({ where: { apiToken: { id: tokenId }, action: READ_ACTION } })
      ).map((permission: { properties: object; conditions: string[] }) => ({
        properties: permission.properties,
        conditions: permission.conditions,
      }));

    test('Limited owner: a field the owner holds but the calling token does not → 400, no token', async () => {
      const { rqToken } = await mintToken(rqOwner, 'admin-token_e-limited', [
        ...tokenActions,
        read(['username']),
      ]);

      const res = await rqToken({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name: 'admin-token_e-limited-child', adminPermissions: [read(['email'])] },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
      expect(res.body.error.message).toContain('not held by the calling token');
      expect(await findTokensByName('admin-token_e-limited-child')).toHaveLength(0);
    });

    test('Limited owner: a field the calling token holds → 201, stored as requested', async () => {
      const { rqToken } = await mintToken(rqOwner, 'admin-token_e-limited', [
        ...tokenActions,
        read(['username']),
      ]);

      const res = await rqToken({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name: 'admin-token_e-limited-child', adminPermissions: [read(['username'])] },
      });

      expect(res.statusCode).toBe(201);
      expect(await findReadPermissions(res.body.data.id)).toEqual([
        { properties: { fields: ['username'] }, conditions: [] },
      ]);
    });

    test('Super-admin owner does not lift the calling token check → 400, no token', async () => {
      const { rqToken } = await mintToken(rq, 'admin-token_e-super-admin', [
        tokenActions[0],
        read(['username']),
      ]);

      const res = await rqToken({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_e-super-admin-child',
          adminPermissions: [read(['username', 'email'])],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toContain('not held by the calling token');
      expect(await findTokensByName('admin-token_e-super-admin-child')).toHaveLength(0);
    });

    test('Super-admin owner: a field the calling token holds → 201', async () => {
      const { rqToken } = await mintToken(rq, 'admin-token_e-super-admin', [
        tokenActions[0],
        read(['username']),
      ]);

      const res = await rqToken({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_e-super-admin-child',
          adminPermissions: [read(['username'])],
        },
      });

      expect(res.statusCode).toBe(201);
    });

    test('Limited owner: updating a sibling token beyond the calling token → 400, sibling unchanged', async () => {
      const { rqToken } = await mintToken(rqOwner, 'admin-token_e-updater', [
        ...tokenActions,
        read(['username']),
      ]);
      const { token: sibling } = await mintToken(rqOwner, 'admin-token_e-sibling', [
        read(['username']),
      ]);

      const res = await rqToken({
        url: `/admin/admin-tokens/${sibling.id}`,
        method: 'PUT',
        body: { adminPermissions: [read(['username']), read(['email'])] },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toContain('not held by the calling token');
      expect(await findReadPermissions(sibling.id)).toEqual([
        { properties: { fields: ['username'] }, conditions: [] },
      ]);
    });

    /**
     * Creates an owner holding the token actions and one role per entry of `rolePermissions`,
     * runs `fn` with a request authenticated as that owner, then removes the owner and roles.
     */
    const withOwner = async (
      name: string,
      rolePermissions: object[][],
      fn: (rqLimitedOwner: Awaited<ReturnType<typeof createAuthRequest>>) => Promise<void>
    ) => {
      const utils = createUtils(strapi);
      const roleIds: number[] = [];
      let userId: number | undefined;

      try {
        for (const [index, permissions] of rolePermissions.entries()) {
          const role = await utils.createRole({ name: `${name}-role-${index}`, description: name });
          roleIds.push(role.id);
          await utils.assignPermissionsToRole(role.id, [
            ...(index === 0 ? tokenActions : []),
            ...permissions,
          ]);
        }

        const email = `${name}@test.com`;
        const user = await utils.createUser({
          email,
          firstname: 'Token',
          lastname: 'Owner',
          isActive: true,
          roles: roleIds,
        });
        userId = user.id;

        await fn(
          await createAuthRequest({
            strapi,
            userInfo: { email, firstname: 'Token', lastname: 'Owner', password: 'Password123' },
          })
        );
      } finally {
        if (userId !== undefined)
          await strapi.db.query('admin::user').delete({ where: { id: userId } });
        for (const roleId of roleIds)
          await strapi.db.query('admin::role').delete({ where: { id: roleId } });
      }
    };

    // The owner re-sync makes a token's conditions follow its owner, so a child stored with the
    // calling token's stricter condition would be widened on the owner's next role change
    test('The owner holds the field unconditionally and the calling token under a condition → 400, no token', async () => {
      const { token, rqToken } = await mintToken(rqOwner, 'admin-token_e-conditional', [
        tokenActions[0],
        read(['username']),
      ]);

      await strapi.db.query('admin::permission').updateMany({
        where: { apiToken: { id: token.id }, action: READ_ACTION },
        data: { conditions: [IS_CREATOR] },
      });

      const res = await rqToken({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_e-conditional-child',
          adminPermissions: [read(['username'])],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
      expect(res.body.error.message).toContain(
        "not held by the calling token under the owner's conditions"
      );
      expect(await findTokensByName('admin-token_e-conditional-child')).toHaveLength(0);
    });

    test('The owner holds the field unconditionally and the calling token under a condition, update path → 400, sibling unchanged', async () => {
      const { token, rqToken } = await mintToken(rqOwner, 'admin-token_e-conditional-updater', [
        ...tokenActions,
        read(['username']),
      ]);
      const { token: sibling } = await mintToken(rqOwner, 'admin-token_e-conditional-sibling', [
        tokenActions[0],
      ]);

      await strapi.db.query('admin::permission').updateMany({
        where: { apiToken: { id: token.id }, action: READ_ACTION },
        data: { conditions: [IS_CREATOR] },
      });

      const res = await rqToken({
        url: `/admin/admin-tokens/${sibling.id}`,
        method: 'PUT',
        body: { adminPermissions: [tokenActions[0], read(['username'])] },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toContain(
        "not held by the calling token under the owner's conditions"
      );
      expect(await findReadPermissions(sibling.id)).toEqual([]);
    });

    test('A field the calling token got under a condition only because of another field → 400, no token', async () => {
      await withOwner(
        'admin-token_e-two-roles',
        [[read(['username'])], [{ ...read(['email']), conditions: [IS_CREATOR] }]],
        async (rqLimitedOwner) => {
          const { token, rqToken } = await mintToken(rqLimitedOwner, 'admin-token_e-two-roles', [
            tokenActions[0],
            read(['username', 'email']),
          ]);

          // `email` is held under is-creator only, so a token for both fields inherits it
          expect(await findReadPermissions(token.id)).toEqual([
            { properties: { fields: ['username', 'email'] }, conditions: [IS_CREATOR] },
          ]);

          const res = await rqToken({
            url: '/admin/admin-tokens',
            method: 'POST',
            body: {
              name: 'admin-token_e-two-roles-child',
              adminPermissions: [read(['username'])],
            },
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.error.message).toContain(
            "not held by the calling token under the owner's conditions"
          );
          expect(await findTokensByName('admin-token_e-two-roles-child')).toHaveLength(0);
        }
      );
    });

    test('Limited owner: the owner conditions within the calling token → 201, stored with the owner conditions', async () => {
      await withOwner(
        'admin-token_e-conditional-owner',
        [[{ ...read(['username']), conditions: [IS_CREATOR] }]],
        async (rqLimitedOwner) => {
          const { rqToken } = await mintToken(rqLimitedOwner, 'admin-token_e-conditional-owner', [
            tokenActions[0],
            read(['username']),
          ]);

          const res = await rqToken({
            url: '/admin/admin-tokens',
            method: 'POST',
            body: {
              name: 'admin-token_e-conditional-owner-child',
              adminPermissions: [read(['username'])],
            },
          });

          expect(res.statusCode).toBe(201);
          expect(await findReadPermissions(res.body.data.id)).toEqual([
            { properties: { fields: ['username'] }, conditions: [IS_CREATOR] },
          ]);
        }
      );
    });

    test('Super-admin owner: the calling token condition is inherited → 201, and the re-sync keeps it', async () => {
      const { token, rqToken } = await mintToken(rq, 'admin-token_e-super-admin-conditional', [
        tokenActions[0],
        read(['username']),
      ]);

      // Only the owner's conditions can be inherited through the API, so narrow the token here
      await strapi.db.query('admin::permission').updateMany({
        where: { apiToken: { id: token.id }, action: READ_ACTION },
        data: { conditions: [IS_CREATOR] },
      });

      const res = await rqToken({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'admin-token_e-super-admin-conditional-child',
          adminPermissions: [read(['username'])],
        },
      });

      expect(res.statusCode).toBe(201);
      const childId = res.body.data.id;
      const stored = [{ properties: { fields: ['username'] }, conditions: [IS_CREATOR] }];
      expect(await findReadPermissions(childId)).toEqual(stored);

      // A role change and a full re-clamp skip super-admin owners
      await createUtils(strapi).assignPermissionsToRole(ownerRoleId, [
        ...tokenActions,
        { action: 'admin::admin-tokens.read', subject: null, conditions: [], properties: {} },
        read(['username', 'email']),
        { action: EDITOR_ACTION, subject: null, conditions: [], properties: {} },
      ]);
      await (
        strapi.service('admin::api-token-admin') as { syncPermissionsForAllUsers(): Promise<void> }
      ).syncPermissionsForAllUsers();

      expect(await findReadPermissions(childId)).toEqual(stored);
    });
  });

  /**
   * A request made with an admin token may read the key of, or regenerate, only the token it was
   * made with, not the other tokens of its owner.
   */
  describe('F — token-authenticated key read and regenerate', () => {
    const KEY_ACTIONS = ['admin::admin-tokens.read', 'admin::admin-tokens.regenerate'].map(
      (action) => ({ action, subject: null, conditions: [], properties: {} })
    );

    const mintToken = async (name: string, adminPermissions: object[] = KEY_ACTIONS) => {
      const res = await rqEditor({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: { name, adminPermissions },
      });

      expect(res.statusCode).toBe(201);

      return {
        token: res.body.data,
        rqToken: createRequest({ strapi }).setToken(res.body.data.accessKey),
      };
    };

    test("Reading a sibling token's key → no accessKey", async () => {
      const { rqToken } = await mintToken('admin-token_f-caller');
      const { token: sibling } = await mintToken('admin-token_f-sibling');

      const res = await rqToken({ url: `/admin/admin-tokens/${sibling.id}`, method: 'GET' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(sibling.id);
      expect(res.body.data.accessKey).toBeUndefined();
    });

    test('Reading its own key → accessKey', async () => {
      const { token, rqToken } = await mintToken('admin-token_f-caller');

      const res = await rqToken({ url: `/admin/admin-tokens/${token.id}`, method: 'GET' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.accessKey).toBe(token.accessKey);
    });

    test('Regenerating a sibling token → 403, key unchanged', async () => {
      const { rqToken } = await mintToken('admin-token_f-caller');
      const { token: sibling } = await mintToken('admin-token_f-sibling');
      const before = await strapi.db
        .query('admin::api-token')
        .findOne({ where: { id: sibling.id }, select: ['accessKey'] });

      const res = await rqToken({
        url: `/admin/admin-tokens/${sibling.id}/regenerate`,
        method: 'POST',
      });

      expect(res.statusCode).toBe(403);
      const after = await strapi.db
        .query('admin::api-token')
        .findOne({ where: { id: sibling.id }, select: ['accessKey'] });
      expect(after.accessKey).toBe(before.accessKey);
    });

    test('Regenerating itself → 201 with a new key', async () => {
      const { token, rqToken } = await mintToken('admin-token_f-caller');

      const res = await rqToken({
        url: `/admin/admin-tokens/${token.id}/regenerate`,
        method: 'POST',
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.accessKey).toEqual(expect.any(String));
      expect(res.body.data.accessKey).not.toBe(token.accessKey);
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
        userInfo: {
          email: 'temp-deletable@test.com',
          firstname: 'Temp',
          lastname: 'Delete',
          password: 'Password123',
        },
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
        userInfo: {
          email: 'temp-blocked@test.com',
          firstname: 'Blocked',
          lastname: 'User',
          password: 'Password123',
        },
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
