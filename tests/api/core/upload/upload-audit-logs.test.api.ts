import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Media library in audit logs (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;
  let actingAdminId: number;
  let initialSettings: unknown;

  const actingAdmin = {
    email: 'media-audit-actor@test.com',
    firstname: 'Media',
    lastname: 'Actor',
    password: 'Password123',
  };

  const settings = {
    sizeOptimization: true,
    responsiveDimensions: true,
    autoOrientation: false,
    aiMetadata: true,
  };

  const expectedActor = () => ({
    type: 'admin-user',
    user: { id: actingAdminId, email: actingAdmin.email, name: 'Media Actor' },
  });

  const getSettingsStore = () => strapi.store({ type: 'plugin', name: 'upload', key: 'settings' });

  const findLogs = async (action: string) =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  const clearAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  const putSettings = async (body: Record<string, unknown>) => {
    const res = await rq({ url: '/upload/settings', method: 'PUT', body });
    expect(res.statusCode).toBe(200);
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();

    // Requests run as an admin of our own: with only the default super admin in the
    // database, asserting the actor would prove nothing.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const actor = await utils.createUser({ ...actingAdmin, roles: [superAdminRole.id] });
    actingAdminId = actor.id;

    initialSettings = await getSettingsStore().get({});

    rq = await createAuthRequest({ strapi, userInfo: actingAdmin });
  });

  afterAll(async () => {
    await getSettingsStore().set({ value: initialSettings });
    await clearAuditLogs();
    await utils.deleteUserById(actingAdminId);
    await strapi.destroy();
  });

  beforeEach(async () => {
    await getSettingsStore().set({ value: settings });
    await clearAuditLogs();
  });

  describe('upload-settings.update', () => {
    test('records the changed options', async () => {
      await putSettings({ ...settings, sizeOptimization: false, autoOrientation: true });

      const logs = await findLogs('upload-settings.update');
      expect(logs).toHaveLength(1);
      expect(logs[0].user.id).toBe(actingAdminId);
      expect(logs[0].payload).toEqual({
        action: 'upload-settings.update',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'upload-settings' },
        details: {
          changes: {
            sizeOptimization: { before: true, after: false },
            autoOrientation: { before: false, after: true },
          },
        },
      });
      expect(JSON.stringify(logs[0].payload)).not.toContain(actingAdmin.password);
    });

    test('writes no row when nothing changed', async () => {
      await putSettings(settings);

      expect(await findLogs('upload-settings.update')).toHaveLength(0);
    });

    test('writes no row on a rejected update', async () => {
      const res = await rq({
        url: '/upload/settings',
        method: 'PUT',
        body: { sizeOptimization: 'not-a-boolean', responsiveDimensions: true },
      });
      expect(res.statusCode).toBe(400);

      expect(await findLogs('upload-settings.update')).toHaveLength(0);
    });
  });
});
