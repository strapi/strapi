import fs from 'fs';
import path from 'path';

import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const LOGO_PATH = path.join(__dirname, '../../utils/logo.png');

describeOnCondition(edition === 'EE')('Project settings in audit logs (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;
  let actingAdminId: number;
  let initialProjectSettings: unknown;

  const actingAdmin = {
    email: 'project-settings-audit-actor@test.com',
    firstname: 'Project',
    lastname: 'Actor',
    password: 'Password123',
  };

  const getAdminStore = () => strapi.store({ type: 'core', name: 'admin' });

  const findLogs = async () =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action: 'project-settings.update' },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  const clearAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  const postSettings = async (formData: Record<string, unknown>) => {
    const res = await rq({ url: '/admin/project-settings', method: 'POST', formData });
    expect(res.statusCode).toBe(200);
  };

  const uploadMenuLogo = () => postSettings({ menuLogo: fs.createReadStream(LOGO_PATH) });

  const expectOneRow = async (changes: Record<string, unknown>) => {
    const logs = await findLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].user.id).toBe(actingAdminId);
    expect(logs[0].payload).toEqual({
      action: 'project-settings.update',
      date: expect.any(String),
      actor: {
        type: 'admin-user',
        user: { id: actingAdminId, email: actingAdmin.email, name: 'Project Actor' },
      },
      origin: 'admin-panel',
      resource: { type: 'project-settings' },
      details: { changes },
    });

    const stored = JSON.stringify(logs[0].payload);
    expect(stored).not.toContain('/uploads/');
    expect(stored).not.toContain('"hash"');
    expect(stored).not.toContain(actingAdmin.password);
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();

    // Requests run as an admin of our own: with only the default super admin in the
    // database, asserting the actor would prove nothing.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const actor = await utils.createUser({ ...actingAdmin, roles: [superAdminRole.id] });
    actingAdminId = actor.id;

    initialProjectSettings = await (await getAdminStore()).get({ key: 'project-settings' });

    rq = await createAuthRequest({ strapi, userInfo: actingAdmin });
  });

  afterAll(async () => {
    await (await getAdminStore()).set({ key: 'project-settings', value: initialProjectSettings });
    await clearAuditLogs();
    await utils.deleteUserById(actingAdminId);
    await strapi.destroy();
  });

  beforeEach(async () => {
    await (
      await getAdminStore()
    ).set({
      key: 'project-settings',
      value: { menuLogo: null, authLogo: null },
    });
    await clearAuditLogs();
  });

  test('records an uploaded logo by file name', async () => {
    await uploadMenuLogo();

    await expectOneRow({ menuLogo: { before: null, after: 'logo.png' } });
  });

  test('records a reset logo as null', async () => {
    await uploadMenuLogo();
    await clearAuditLogs();

    await postSettings({ menuLogo: 'null' });

    await expectOneRow({ menuLogo: { before: 'logo.png', after: null } });
  });

  test('records a new upload of a file with the same name', async () => {
    await uploadMenuLogo();
    await clearAuditLogs();

    await uploadMenuLogo();

    await expectOneRow({ menuLogo: { before: 'logo.png', after: 'logo.png' } });
  });

  test('writes no row when no logo changes', async () => {
    await uploadMenuLogo();
    await clearAuditLogs();

    // Resets the auth logo, which is already empty, and keeps the menu logo.
    await postSettings({ authLogo: 'null' });

    expect(await findLogs()).toHaveLength(0);
  });

  test('writes no row for an unknown field', async () => {
    const res = await rq({
      url: '/admin/project-settings',
      method: 'POST',
      formData: { unknown: 'value' },
    });
    expect(res.statusCode).toBe(400);

    expect(await findLogs()).toHaveLength(0);
  });
});
