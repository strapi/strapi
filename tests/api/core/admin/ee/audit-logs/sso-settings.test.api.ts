import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('SSO settings in audit logs (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;
  let hasSSO: boolean;
  let actingAdminId: number;
  let roleA: { id: number };
  let roleB: { id: number };
  let initialAuthSettings: unknown;

  const actingAdmin = {
    email: 'sso-settings-audit-actor@test.com',
    firstname: 'SSO',
    lastname: 'Actor',
    password: 'Password123',
  };

  const baseOptions = { autoRegister: false, defaultRole: null, ssoLockedRoles: [] as number[] };

  const expectedActor = () => ({
    type: 'admin-user',
    user: { id: actingAdminId, email: actingAdmin.email, name: 'SSO Actor' },
  });

  const getAdminStore = () => strapi.store({ type: 'core', name: 'admin' });

  const findLogs = async () =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action: 'sso-settings.update' },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  const clearAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  const putOptions = (body: Record<string, unknown>) =>
    rq({ url: '/admin/providers/options', method: 'PUT', body });

  const updateOptions = async (body: Record<string, unknown>) => {
    const res = await putOptions(body);
    expect(res.statusCode).toBe(200);
  };

  const expectOneRow = async (changes: Record<string, unknown>) => {
    const logs = await findLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].user.id).toBe(actingAdminId);
    expect(logs[0].payload).toEqual({
      action: 'sso-settings.update',
      date: expect.any(String),
      actor: expectedActor(),
      origin: 'admin-panel',
      resource: { type: 'sso-settings' },
      details: { changes },
    });
    expect(JSON.stringify(logs[0].payload)).not.toContain(actingAdmin.password);
  };

  const expectNoRow = async () => {
    expect(await findLogs()).toHaveLength(0);
  };

  // The route only exists when the licence includes SSO.
  const ssoTest = (name: string, fn: () => Promise<void>) =>
    test(name, async () => {
      if (!hasSSO) {
        const res = await putOptions(baseOptions);
        expect(res.statusCode).toBe(404);
        return;
      }

      await fn();
    });

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    hasSSO = strapi.ee.features.isEnabled('sso');

    // Requests run as an admin of our own: with only the default super admin in the
    // database, asserting the actor would prove nothing.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const actor = await utils.createUser({ ...actingAdmin, roles: [superAdminRole.id] });
    actingAdminId = actor.id;

    roleA = await utils.createRole({ name: 'sso-audit-role-a', description: '' });
    roleB = await utils.createRole({ name: 'sso-audit-role-b', description: '' });

    initialAuthSettings = await (await getAdminStore()).get({ key: 'auth' });

    rq = await createAuthRequest({ strapi, userInfo: actingAdmin });
  });

  afterAll(async () => {
    await (await getAdminStore()).set({ key: 'auth', value: initialAuthSettings });
    await clearAuditLogs();
    await utils.deleteRolesById([roleA.id, roleB.id]);
    await utils.deleteUserById(actingAdminId);
    await strapi.destroy();
  });

  beforeEach(async () => {
    const adminStore = await getAdminStore();
    const authSettings = (await adminStore.get({ key: 'auth' })) as Record<string, unknown>;
    await adminStore.set({ key: 'auth', value: { ...authSettings, providers: baseOptions } });
    await clearAuditLogs();
  });

  ssoTest('records a change to autoRegister', async () => {
    await updateOptions({ ...baseOptions, autoRegister: true, defaultRole: roleA.id });

    await expectOneRow({
      autoRegister: { before: false, after: true },
      defaultRole: { before: null, after: roleA.id },
    });
  });

  ssoTest('records a change to defaultRole', async () => {
    await updateOptions({ ...baseOptions, defaultRole: roleA.id });

    await expectOneRow({ defaultRole: { before: null, after: roleA.id } });
  });

  ssoTest('records a change to ssoLockedRoles', async () => {
    await updateOptions({ ...baseOptions, ssoLockedRoles: [roleA.id, roleB.id] });

    await expectOneRow({ ssoLockedRoles: { before: [], after: [roleA.id, roleB.id] } });
  });

  ssoTest('records ssoLockedRoles sorted, whatever the request order', async () => {
    const [low, high] = [roleA.id, roleB.id].sort((a, b) => a - b);
    await updateOptions({ ...baseOptions, ssoLockedRoles: [high, low] });

    await expectOneRow({ ssoLockedRoles: { before: [], after: [low, high] } });
  });

  ssoTest('records role ids sent as strings as numbers', async () => {
    await updateOptions({
      ...baseOptions,
      defaultRole: String(roleA.id),
      ssoLockedRoles: [String(roleB.id)],
    });

    await expectOneRow({
      defaultRole: { before: null, after: roleA.id },
      ssoLockedRoles: { before: [], after: [roleB.id] },
    });
  });

  ssoTest('writes no row when nothing changed', async () => {
    await updateOptions(baseOptions);

    await expectNoRow();
  });

  ssoTest('writes no row when ssoLockedRoles are only reordered', async () => {
    await updateOptions({ ...baseOptions, ssoLockedRoles: [roleA.id, roleB.id] });
    await clearAuditLogs();

    await updateOptions({ ...baseOptions, ssoLockedRoles: [roleB.id, roleA.id] });

    await expectNoRow();
  });

  ssoTest('writes no row when ssoLockedRoles goes from empty to null', async () => {
    await updateOptions({ ...baseOptions, ssoLockedRoles: null });

    await expectNoRow();
  });

  ssoTest('writes no row on a rejected update', async () => {
    const res = await putOptions({ ...baseOptions, defaultRole: 9999 });
    expect(res.statusCode).toBe(400);

    await expectNoRow();
  });
});
