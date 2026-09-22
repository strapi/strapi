import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Webhooks in audit logs (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;
  let actingAdminId: number;

  const actingAdmin = {
    email: 'webhooks-audit-actor@test.com',
    firstname: 'Webhooks',
    lastname: 'Actor',
    password: 'Password123',
  };

  const SECRET = 'Bearer s3cret-token-value';

  const baseWebhook = {
    name: 'Deploy site',
    url: 'https://example.com/hook',
    headers: { Authorization: SECRET, 'X-Env': 'prod' },
    events: ['entry.update', 'entry.create'],
  };

  const expectedActor = () => ({
    type: 'admin-user',
    user: { id: actingAdminId, email: actingAdmin.email, name: 'Webhooks Actor' },
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

  const expectNoSecret = (log: { payload: unknown }) => {
    const serialized = JSON.stringify(log.payload);
    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain('prod');
  };

  const clearAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  const deleteAllWebhooks = async () => {
    await strapi.db.query('strapi::webhook').deleteMany();
  };

  const createWebhook = async (body: Record<string, unknown> = baseWebhook) => {
    const res = await rq({ url: '/admin/webhooks', method: 'POST', body });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const updateWebhook = async (id: string, body: Record<string, unknown>) => {
    const res = await rq({ url: `/admin/webhooks/${id}`, method: 'PUT', body });
    expect(res.statusCode).toBe(200);
    return res.body.data;
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();

    // Requests run as an admin of our own: with only the default super admin in the
    // database, asserting the actor would prove nothing.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const actor = await utils.createUser({ ...actingAdmin, roles: [superAdminRole.id] });
    actingAdminId = actor.id;

    rq = await createAuthRequest({ strapi, userInfo: actingAdmin });
  });

  afterAll(async () => {
    await deleteAllWebhooks();
    await clearAuditLogs();
    await utils.deleteUserById(actingAdminId);
    await strapi.destroy();
  });

  beforeEach(async () => {
    await deleteAllWebhooks();
    await clearAuditLogs();
  });

  test('webhook.create records url, sorted events and header names only', async () => {
    const webhook = await createWebhook();

    const log = await expectExactlyOneLog('webhook.create');
    expect(log.payload).toEqual({
      action: 'webhook.create',
      date: expect.any(String),
      actor: expectedActor(),
      origin: 'admin-panel',
      resource: { type: 'webhook', id: webhook.id, name: 'Deploy site' },
      details: {
        url: 'https://example.com',
        events: ['entry.create', 'entry.update'],
        headers: ['Authorization', 'X-Env'],
        isEnabled: true,
      },
    });
    expectNoSecret(log);
  });

  test('webhook.update records the changed fields with before and after', async () => {
    const webhook = await createWebhook();
    await clearAuditLogs();

    await updateWebhook(webhook.id, {
      name: 'Deploy staging',
      url: 'https://new.example.com/hook',
      headers: { Authorization: SECRET, 'X-Region': 'eu' },
      events: ['entry.create'],
      isEnabled: false,
    });

    const log = await expectExactlyOneLog('webhook.update');
    expect(log.payload).toEqual({
      action: 'webhook.update',
      date: expect.any(String),
      actor: expectedActor(),
      origin: 'admin-panel',
      resource: { type: 'webhook', id: webhook.id, name: 'Deploy staging' },
      details: {
        changes: {
          name: { before: 'Deploy site', after: 'Deploy staging' },
          url: { before: 'https://example.com', after: 'https://new.example.com' },
          events: { before: ['entry.create', 'entry.update'], after: ['entry.create'] },
          headers: { added: ['X-Region'], removed: ['X-Env'], changed: [] },
          isEnabled: { before: true, after: false },
        },
      },
    });
    expectNoSecret(log);
  });

  test('webhook.create records the scheme and host of the url only', async () => {
    const webhook = await createWebhook({
      ...baseWebhook,
      url: 'https://user:s3cretpw@hooks.example.com/services/T1/B2/xyz?token=qt0ken',
    });

    const log = await expectExactlyOneLog('webhook.create');
    expect(log.payload.details.url).toBe('https://hooks.example.com');
    expect(JSON.stringify(log.payload)).not.toMatch(/s3cretpw|xyz|qt0ken/);
    expectNoSecret(log);
    expect(webhook.url).toContain('qt0ken');
  });

  test('webhook.update records a url change within the same host without the path', async () => {
    const webhook = await createWebhook({
      ...baseWebhook,
      url: 'https://hooks.example.com/services/old-t0ken',
    });
    await clearAuditLogs();

    await updateWebhook(webhook.id, {
      ...baseWebhook,
      url: 'https://hooks.example.com/services/new-t0ken',
    });

    const log = await expectExactlyOneLog('webhook.update');
    expect(log.payload.details).toEqual({
      changes: { url: { before: 'https://hooks.example.com', after: 'https://hooks.example.com' } },
    });
    expect(JSON.stringify(log.payload)).not.toMatch(/t0ken/);
  });

  test('webhook.update records a rotated header value without the value', async () => {
    const webhook = await createWebhook();
    await clearAuditLogs();

    const rotated = 'Bearer rotated-token-value';
    await updateWebhook(webhook.id, {
      ...baseWebhook,
      headers: { ...baseWebhook.headers, Authorization: rotated },
    });

    const log = await expectExactlyOneLog('webhook.update');
    expect(log.payload.details).toEqual({
      changes: { headers: { added: [], removed: [], changed: ['Authorization'] } },
    });
    expectNoSecret(log);
    expect(JSON.stringify(log.payload)).not.toContain(rotated);
  });

  test('webhook.update is not recorded when the same values are saved again', async () => {
    const webhook = await createWebhook();
    await clearAuditLogs();

    await updateWebhook(webhook.id, {
      ...baseWebhook,
      events: ['entry.create', 'entry.update'],
      isEnabled: true,
    });

    expect(await findLogs('webhook.update')).toHaveLength(0);
  });

  test('webhook.update records only isEnabled when a full save flips the toggle', async () => {
    const webhook = await createWebhook();
    await clearAuditLogs();

    await updateWebhook(webhook.id, { ...baseWebhook, isEnabled: false });

    const log = await expectExactlyOneLog('webhook.update');
    expect(log.payload.details).toEqual({
      changes: { isEnabled: { before: true, after: false } },
    });
    expectNoSecret(log);
  });

  test('webhook.delete', async () => {
    const webhook = await createWebhook();
    await clearAuditLogs();

    const res = await rq({ url: `/admin/webhooks/${webhook.id}`, method: 'DELETE' });
    expect(res.statusCode).toBe(200);

    const log = await expectExactlyOneLog('webhook.delete');
    expect(log.payload).toEqual({
      action: 'webhook.delete',
      date: expect.any(String),
      actor: expectedActor(),
      origin: 'admin-panel',
      resource: { type: 'webhook', id: webhook.id, name: 'Deploy site' },
    });
    expectNoSecret(log);
  });

  test('batch delete writes one webhook.delete row per deleted webhook', async () => {
    const webhooks = await Promise.all(
      ['one', 'two', 'three'].map((name) => createWebhook({ ...baseWebhook, name }))
    );
    await clearAuditLogs();

    const res = await rq({
      url: '/admin/webhooks/batch-delete',
      method: 'POST',
      body: { ids: webhooks.map((webhook) => webhook.id) },
    });
    expect(res.statusCode).toBe(200);

    const logs = await findLogs('webhook.delete');
    expect(logs.map((log) => log.payload.resource)).toEqual(
      webhooks.map((webhook) => ({ type: 'webhook', id: webhook.id, name: webhook.name }))
    );
    logs.forEach((log) => {
      expect(log.user.id).toBe(actingAdminId);
      expectNoSecret(log);
    });
  });
});
