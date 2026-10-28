import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';
import constants from '../../../../../../packages/core/admin/server/src/services/constants';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Tokens in audit logs (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;
  let actingAdminId: number;

  const actingAdmin = {
    email: 'tokens-audit-actor@test.com',
    firstname: 'Tokens',
    lastname: 'Actor',
    password: 'Password123',
  };

  const expectedActor = () => ({
    type: 'admin-user',
    user: { id: actingAdminId, email: actingAdmin.email, name: 'Tokens Actor' },
  });

  const findLogs = async (action: string) =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  const expectExactlyOneLog = async (action: string) => {
    const logs = await findLogs(action);
    expect(logs).toHaveLength(1);
    expect(logs[0].user.id).toBe(actingAdminId);
    return logs[0];
  };

  const expectNoLog = async (action: string) => {
    expect(await findLogs(action)).toHaveLength(0);
  };

  const expectNoSecret = (log: { payload: unknown }, accessKey?: string) => {
    const serialized = JSON.stringify(log.payload);
    expect(serialized).not.toMatch(/accessKey|encryptedKey/);
    if (accessKey) {
      expect(serialized).not.toContain(accessKey);
    }
  };

  const clearAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  const deleteAllTokens = async () => {
    await strapi.db.query('admin::api-token').deleteMany();
    await strapi.db.query('admin::transfer-token').deleteMany();
  };

  const post = async (url: string, body: Record<string, unknown>) => {
    const res = await rq({ url, method: 'POST', body });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const put = async (url: string, body: Record<string, unknown>) => {
    const res = await rq({ url, method: 'PUT', body });
    expect(res.statusCode).toBe(200);
    return res.body.data;
  };

  const del = async (url: string) => {
    const res = await rq({ url, method: 'DELETE' });
    expect(res.statusCode).toBe(200);
    return res.body.data;
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    // Requests run as an admin of our own: with only the default super admin in the
    // database, asserting the actor would prove nothing.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const actor = await utils.createUser({ ...actingAdmin, roles: [superAdminRole.id] });
    actingAdminId = actor.id;

    rq = await createAuthRequest({ strapi, userInfo: actingAdmin });
    await deleteAllTokens();
  });

  afterAll(async () => {
    await deleteAllTokens();
    await clearAuditLogs();
    await utils.deleteUserById(actingAdminId);
    await strapi.destroy();
  });

  beforeEach(async () => {
    await deleteAllTokens();
    await clearAuditLogs();
  });

  describe('content-api tokens', () => {
    const base = '/admin/api-tokens';

    test('token.create', async () => {
      const token = await post(base, {
        name: 'ci',
        description: 'deploys',
        type: 'read-only',
        lifespan: constants.API_TOKEN_LIFESPANS.DAYS_7,
      });

      const log = await expectExactlyOneLog('token.create');
      expect(log.payload).toEqual({
        action: 'token.create',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'content-api', id: token.id, name: 'ci' },
        details: {
          description: 'deploys',
          lifespan: constants.API_TOKEN_LIFESPANS.DAYS_7,
          expiresAt: expect.any(String),
          type: 'read-only',
        },
      });
      expectNoSecret(log, token.accessKey);
    });

    test('token.update records name, description and type changes', async () => {
      const token = await post(base, { name: 'ci', description: '', type: 'read-only' });
      await clearAuditLogs();

      await put(`${base}/${token.id}`, {
        name: 'ci-2',
        description: 'renamed',
        type: 'full-access',
      });

      const log = await expectExactlyOneLog('token.update');
      expect(log.payload.resource).toEqual({
        type: 'content-api',
        id: token.id,
        name: 'ci-2',
      });
      expect(log.payload.details).toEqual({
        changes: {
          name: { before: 'ci', after: 'ci-2' },
          description: { before: '', after: 'renamed' },
          type: { before: 'read-only', after: 'full-access' },
        },
      });
      expectNoSecret(log);
    });

    test('token.update is not recorded when nothing changed', async () => {
      const token = await post(base, { name: 'ci', description: 'same', type: 'read-only' });
      await clearAuditLogs();

      await put(`${base}/${token.id}`, { name: 'ci', description: 'same', type: 'read-only' });

      await expectNoLog('token.update');
    });

    test('token.create and token.update record the scope of a custom token', async () => {
      const { keys } = strapi.contentAPI.permissions.providers.action;
      strapi.contentAPI.permissions.providers.action.keys = jest.fn(() => [
        'api::a.a.find',
        'api::b.b.find',
        'api::c.c.find',
      ]);

      try {
        const token = await post(base, {
          name: 'ci',
          type: 'custom',
          permissions: ['api::b.b.find', 'api::a.a.find'],
        });

        const created = await expectExactlyOneLog('token.create');
        expect(created.payload.details).toEqual({
          description: '',
          lifespan: null,
          expiresAt: null,
          type: 'custom',
          permissions: ['api::a.a.find', 'api::b.b.find'],
        });
        await clearAuditLogs();

        await put(`${base}/${token.id}`, { permissions: ['api::c.c.find', 'api::a.a.find'] });

        const updated = await expectExactlyOneLog('token.update');
        expect(updated.payload.details).toEqual({
          changes: {
            permissions: {
              before: ['api::a.a.find', 'api::b.b.find'],
              after: ['api::a.a.find', 'api::c.c.find'],
            },
          },
        });
      } finally {
        strapi.contentAPI.permissions.providers.action.keys = keys;
      }
    });

    test('token.delete', async () => {
      const token = await post(base, { name: 'ci', type: 'read-only' });
      await clearAuditLogs();

      await del(`${base}/${token.id}`);

      const log = await expectExactlyOneLog('token.delete');
      expect(log.payload).toEqual({
        action: 'token.delete',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'content-api', id: token.id, name: 'ci' },
      });
      expectNoSecret(log, token.accessKey);
    });

    test('token.regenerate never records the new key', async () => {
      const token = await post(base, { name: 'ci', type: 'read-only' });
      await clearAuditLogs();

      const regenerated = await post(`${base}/${token.id}/regenerate`, {});
      expect(regenerated.accessKey).not.toBe(token.accessKey);

      const log = await expectExactlyOneLog('token.regenerate');
      expect(log.payload).toEqual({
        action: 'token.regenerate',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'content-api', id: token.id, name: 'ci' },
      });
      expectNoSecret(log, token.accessKey);
      expectNoSecret(log, regenerated.accessKey);
    });
  });

  describe('admin tokens', () => {
    const base = '/admin/admin-tokens';
    const READ = 'admin::webhooks.read';
    const CREATE = 'admin::webhooks.create';

    test('token.create records the owner id and the permission refs', async () => {
      const token = await post(base, {
        name: 'bot',
        adminPermissions: [{ action: READ, subject: null, conditions: [], properties: {} }],
      });

      const log = await expectExactlyOneLog('token.create');
      expect(log.payload.resource).toEqual({
        type: 'admin',
        id: token.id,
        name: 'bot',
      });
      expect(log.payload.details).toMatchObject({
        description: '',
        lifespan: null,
        expiresAt: null,
        adminUserOwner: actingAdminId,
        permissions: [{ action: READ, subject: null }],
      });
      expect(log.payload.details.permissions).toHaveLength(1);
      expect(log.payload.details).not.toHaveProperty('type');
      expect(JSON.stringify(log.payload.details)).not.toContain(actingAdmin.email);
      expectNoSecret(log, token.accessKey);
    });

    test('token.update records a permission change', async () => {
      const token = await post(base, {
        name: 'bot',
        adminPermissions: [{ action: READ, subject: null, conditions: [], properties: {} }],
      });
      await clearAuditLogs();

      await put(`${base}/${token.id}`, {
        adminPermissions: [{ action: CREATE, subject: null, conditions: [], properties: {} }],
      });

      const log = await expectExactlyOneLog('token.update');
      expect(log.payload.details).toMatchObject({
        adminUserOwner: actingAdminId,
        changes: {
          permissions: {
            before: [{ action: READ, subject: null }],
            after: [{ action: CREATE, subject: null }],
          },
        },
      });
      expect(Object.keys(log.payload.details.changes)).toEqual(['permissions']);
      expectNoSecret(log);
    });

    test('token.delete records the owner id', async () => {
      const token = await post(base, { name: 'bot' });
      await clearAuditLogs();

      await del(`${base}/${token.id}`);

      const log = await expectExactlyOneLog('token.delete');
      expect(log.payload.resource).toEqual({
        type: 'admin',
        id: token.id,
        name: 'bot',
      });
      expect(log.payload.details).toEqual({ adminUserOwner: actingAdminId });
      expectNoSecret(log, token.accessKey);
    });

    test('token.regenerate', async () => {
      const token = await post(base, { name: 'bot' });
      await clearAuditLogs();

      const regenerated = await post(`${base}/${token.id}/regenerate`, {});

      const log = await expectExactlyOneLog('token.regenerate');
      expect(log.payload.resource).toEqual({
        type: 'admin',
        id: token.id,
        name: 'bot',
      });
      expect(log.payload.details).toEqual({ adminUserOwner: actingAdminId });
      expectNoSecret(log, token.accessKey);
      expectNoSecret(log, regenerated.accessKey);
    });
  });

  describe('transfer tokens', () => {
    const base = '/admin/transfer/tokens';

    test('token.create records the scope', async () => {
      const token = await post(base, { name: 'mover', description: '', permissions: ['push'] });

      const log = await expectExactlyOneLog('token.create');
      expect(log.payload).toEqual({
        action: 'token.create',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'transfer', id: token.id, name: 'mover' },
        details: { description: '', lifespan: null, expiresAt: null, permissions: ['push'] },
      });
      expectNoSecret(log, token.accessKey);
    });

    test('token.update records a scope change', async () => {
      const token = await post(base, { name: 'mover', description: '', permissions: ['push'] });
      await clearAuditLogs();

      await put(`${base}/${token.id}`, {
        name: 'mover',
        description: '',
        permissions: ['pull', 'push'],
      });

      const log = await expectExactlyOneLog('token.update');
      expect(log.payload.details).toEqual({
        changes: { permissions: { before: ['push'], after: ['pull', 'push'] } },
      });
      expectNoSecret(log);
    });

    test('token.update is not recorded when nothing changed', async () => {
      const token = await post(base, { name: 'mover', description: '', permissions: ['push'] });
      await clearAuditLogs();

      await put(`${base}/${token.id}`, { name: 'mover', description: '', permissions: ['push'] });

      await expectNoLog('token.update');
    });

    test('token.delete', async () => {
      const token = await post(base, { name: 'mover', description: '', permissions: ['push'] });
      await clearAuditLogs();

      await del(`${base}/${token.id}`);

      const log = await expectExactlyOneLog('token.delete');
      expect(log.payload.resource).toEqual({
        type: 'transfer',
        id: token.id,
        name: 'mover',
      });
      expect(log.payload).not.toHaveProperty('details');
      expectNoSecret(log, token.accessKey);
    });

    test('token.regenerate', async () => {
      const token = await post(base, { name: 'mover', description: '', permissions: ['push'] });
      await clearAuditLogs();

      const regenerated = await post(`${base}/${token.id}/regenerate`, {});

      const log = await expectExactlyOneLog('token.regenerate');
      expect(log.payload.resource).toEqual({
        type: 'transfer',
        id: token.id,
        name: 'mover',
      });
      expectNoSecret(log, token.accessKey);
      expectNoSecret(log, regenerated.accessKey);
    });
  });
});
