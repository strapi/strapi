import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

// Registering the first super admin needs an empty admin table, so this runs on its own
// and restores the users it removed.
describeOnCondition(edition === 'EE')('First super admin in audit logs (api)', () => {
  let strapi: Core.Strapi;
  let rq: ReturnType<typeof createRequest>;
  let originalAdminUsers: Array<Record<string, unknown> & { roles?: Array<{ id: number }> }> = [];

  const findLogs = (action: string) =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  beforeAll(async () => {
    strapi = await createStrapiInstance({ ensureSuperAdmin: false });
    rq = createRequest({ strapi });
    originalAdminUsers = await strapi.db.query('admin::user').findMany({ populate: ['roles'] });
    await strapi.db.query('admin::audit-log').deleteMany();
    await strapi.db.query('admin::user').deleteMany({});
  });

  afterAll(async () => {
    await strapi.db.query('admin::user').deleteMany({});
    for (const { roles = [], ...user } of originalAdminUsers) {
      await strapi.db
        .query('admin::user')
        .create({ data: { ...user, roles: roles.map((role) => role.id) } });
    }
    await strapi.db.query('admin::audit-log').deleteMany();
    await strapi.destroy();
  });

  test('admin-user.create records the registration with an unknown actor', async () => {
    const res = await rq({
      url: '/admin/register-admin',
      method: 'POST',
      body: {
        email: 'first@accounts-audit.test',
        firstname: 'First',
        lastname: 'Admin',
        password: 'Password123',
      },
    });
    expect(res.statusCode).toBe(200);

    const superAdminRole = await createUtils(strapi).getSuperAdminRole();

    const logs = await findLogs('admin-user.create');
    expect(logs).toHaveLength(1);
    const [log] = logs;
    expect(log.user).toBeNull();
    expect(log.payload).toEqual({
      action: 'admin-user.create',
      date: expect.any(String),
      actor: { type: 'unknown' },
      origin: 'admin-panel',
      resource: {
        type: 'admin-user',
        id: res.body.data.user.id,
        email: 'first@accounts-audit.test',
      },
      details: {
        email: 'first@accounts-audit.test',
        firstname: 'First',
        lastname: 'Admin',
        roles: [superAdminRole.id],
        isActive: true,
      },
    });

    const serialized = JSON.stringify(log.payload);
    expect(serialized).not.toMatch(/"password":|resetPasswordToken|registrationToken|\$2[aby]\$/);
    expect(serialized).not.toContain('Password123');

    expect(await findLogs('user.create')).toHaveLength(0);
  });
});
