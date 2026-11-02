import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const LEGACY_EVENTS = ['user.create', 'user.update', 'user.delete'];

describeOnCondition(edition === 'EE')('Admin accounts in audit logs (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let publicRq: ReturnType<typeof createRequest>;
  let utils: ReturnType<typeof createUtils>;
  let actingAdminId: number;
  let superAdminRoleId: number;

  const actingAdmin = {
    email: 'accounts-audit-actor@test.com',
    firstname: 'Accounts',
    lastname: 'Actor',
    password: 'Password123',
  };

  const expectedActor = () => ({
    type: 'admin-user',
    user: { id: actingAdminId, email: actingAdmin.email, name: 'Accounts Actor' },
  });

  const unknownActor = { type: 'unknown' };

  const findLogs = async (action: string) =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  const expectExactlyOneLog = async (action: string) => {
    const logs = await findLogs(action);
    expect(logs).toHaveLength(1);
    return logs[0];
  };

  const expectNoLog = async (action: string) => {
    expect(await findLogs(action)).toHaveLength(0);
  };

  const expectNoLegacyLog = async () => {
    const logs = await strapi.db
      .query('admin::audit-log')
      .findMany({ where: { action: { $in: LEGACY_EVENTS } } });
    expect(logs).toHaveLength(0);
  };

  // forgot-password answers before the service runs, so the row lands after the response
  const waitForLog = async (action: string, attempts = 30) => {
    for (let i = 0; i < attempts; i += 1) {
      const logs = await findLogs(action);
      if (logs.length > 0) {
        return logs;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    }
    return findLogs(action);
  };

  const expectNoSecret = (log: { payload: unknown }, ...values: string[]) => {
    const serialized = JSON.stringify(log.payload);
    // Secret fields as JSON keys, and a bcrypt hash by its prefix. The word "password"
    // alone is part of the action names.
    expect(serialized).not.toMatch(/"password":|resetPasswordToken|registrationToken|\$2[aby]\$/);
    for (const value of values) {
      expect(serialized).not.toContain(value);
    }
  };

  const clearAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  const deleteTestUsers = async () => {
    await strapi.db.query('admin::user').deleteMany({
      where: { email: { $endsWith: '@accounts-audit.test' } },
    });
  };

  const inviteUser = async (email: string, overrides: Record<string, unknown> = {}) => {
    const res = await rq({
      url: '/admin/users',
      method: 'POST',
      body: { email, firstname: 'Leo', lastname: 'Diaz', roles: [superAdminRoleId], ...overrides },
    });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const getUserRow = (id: number) => strapi.db.query('admin::user').findOne({ where: { id } });

  beforeAll(async () => {
    strapi = await createStrapiInstance();

    // Requests run as an admin of our own: with only the default super admin in the
    // database, asserting the actor would prove nothing.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    superAdminRoleId = superAdminRole.id;
    const actor = await utils.createUser({ ...actingAdmin, roles: [superAdminRoleId] });
    actingAdminId = actor.id;

    rq = await createAuthRequest({ strapi, userInfo: actingAdmin });
    publicRq = createRequest({ strapi });
    await deleteTestUsers();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await clearAuditLogs();
    await utils.deleteUserById(actingAdminId);
    await strapi.destroy();
  });

  beforeEach(async () => {
    await deleteTestUsers();
    await clearAuditLogs();
  });

  describe('admin-user.create', () => {
    test('records the invitation with the account fields, never the registration token', async () => {
      const invited = await inviteUser('leo@accounts-audit.test');

      const log = await expectExactlyOneLog('admin-user.create');
      expect(log.user.id).toBe(actingAdminId);
      expect(log.payload).toEqual({
        action: 'admin-user.create',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'admin-user', id: invited.id, email: 'leo@accounts-audit.test' },
        details: {
          email: 'leo@accounts-audit.test',
          firstname: 'Leo',
          lastname: 'Diaz',
          roles: [superAdminRoleId],
          isActive: false,
        },
      });
      expectNoSecret(log, invited.registrationToken);
      await expectNoLegacyLog();
    });
  });

  describe('admin-user.invite.accept', () => {
    test('records the accepted invitation with an unknown actor and no other account row', async () => {
      const invited = await inviteUser('leo@accounts-audit.test');
      await clearAuditLogs();

      const res = await publicRq({
        url: '/admin/register',
        method: 'POST',
        body: {
          registrationToken: invited.registrationToken,
          userInfo: { firstname: 'Leo', lastname: 'Diaz', password: 'Password123' },
        },
      });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('admin-user.invite.accept');
      expect(log.user).toBeNull();
      expect(log.payload).toEqual({
        action: 'admin-user.invite.accept',
        date: expect.any(String),
        actor: unknownActor,
        origin: 'admin-panel',
        resource: { type: 'admin-user', id: invited.id, email: 'leo@accounts-audit.test' },
      });
      expectNoSecret(log, invited.registrationToken, 'Password123');

      // The registration also activates the account and sets a password, but nobody was
      // logged in: those rows are not written
      await expectNoLog('admin-user.update');
      await expectNoLog('admin-user.password.update');
      await expectNoLegacyLog();
    });

    test('records nothing for an invalid registration token', async () => {
      const res = await publicRq({
        url: '/admin/register',
        method: 'POST',
        body: {
          registrationToken: 'not-a-token',
          userInfo: { firstname: 'Leo', lastname: 'Diaz', password: 'Password123' },
        },
      });
      expect(res.statusCode).toBe(400);

      await expectNoLog('admin-user.invite.accept');
    });
  });

  describe('admin-user.update', () => {
    test('records the changed fields with before and after', async () => {
      const invited = await inviteUser('leo@accounts-audit.test');
      await clearAuditLogs();

      const res = await rq({
        url: `/admin/users/${invited.id}`,
        method: 'PUT',
        body: { firstname: 'Leon', isActive: true },
      });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('admin-user.update');
      expect(log.user.id).toBe(actingAdminId);
      expect(log.payload).toEqual({
        action: 'admin-user.update',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'admin-user', id: invited.id, email: 'leo@accounts-audit.test' },
        details: {
          changes: {
            firstname: { before: 'Leo', after: 'Leon' },
            isActive: { before: false, after: true },
          },
        },
      });
      expectNoSecret(log);
      await expectNoLegacyLog();
    });

    test('records a role change as sorted id sets', async () => {
      const editorRole = await utils.createRole({
        name: 'accounts-audit-editor',
        description: 'tmp',
      });
      const invited = await inviteUser('leo@accounts-audit.test');
      await clearAuditLogs();

      await rq({
        url: `/admin/users/${invited.id}`,
        method: 'PUT',
        body: { roles: [editorRole.id, superAdminRoleId] },
      });

      const log = await expectExactlyOneLog('admin-user.update');
      expect(log.payload.details).toEqual({
        changes: {
          roles: {
            before: [superAdminRoleId],
            after: [editorRole.id, superAdminRoleId].sort((a, b) => a - b),
          },
        },
      });

      await deleteTestUsers();
      await utils.deleteRolesById([editorRole.id]);
    });

    test('writes no row when nothing changed', async () => {
      const invited = await inviteUser('leo@accounts-audit.test');
      await clearAuditLogs();

      const res = await rq({
        url: `/admin/users/${invited.id}`,
        method: 'PUT',
        body: { firstname: 'Leo', isActive: false, roles: [superAdminRoleId] },
      });
      expect(res.statusCode).toBe(200);

      await expectNoLog('admin-user.update');
    });

    test('the event hub still emits the legacy user.update', async () => {
      const invited = await inviteUser('leo@accounts-audit.test');
      const listener = jest.fn();
      strapi.eventHub.on('user.update', listener);

      try {
        await rq({
          url: `/admin/users/${invited.id}`,
          method: 'PUT',
          body: { firstname: 'Leon' },
        });

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({ user: expect.objectContaining({ id: invited.id }) })
        );
      } finally {
        strapi.eventHub.off('user.update', listener);
      }
    });
  });

  describe('admin-user.password.update', () => {
    test('records a password set by an admin on another account', async () => {
      const invited = await inviteUser('leo@accounts-audit.test');
      await clearAuditLogs();

      const res = await rq({
        url: `/admin/users/${invited.id}`,
        method: 'PUT',
        body: { password: 'Password456' },
      });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('admin-user.password.update');
      expect(log.user.id).toBe(actingAdminId);
      expect(log.payload).toEqual({
        action: 'admin-user.password.update',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'admin-user', id: invited.id, email: 'leo@accounts-audit.test' },
      });
      expectNoSecret(log, 'Password456');
      await expectNoLog('admin-user.update');
      await expectNoLegacyLog();
    });

    test('records a password changed from the profile, with the user as actor and resource', async () => {
      const self = {
        email: 'self@accounts-audit.test',
        firstname: 'Self',
        lastname: 'Service',
        password: 'Password123',
      };
      const selfUser = await utils.createUser({ ...self, roles: [superAdminRoleId] });
      const selfRq = await createAuthRequest({ strapi, userInfo: self });
      await clearAuditLogs();

      const res = await selfRq({
        url: '/admin/users/me',
        method: 'PUT',
        body: { currentPassword: 'Password123', password: 'Password456' },
      });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('admin-user.password.update');
      expect(log.user.id).toBe(selfUser.id);
      expect(log.payload).toEqual({
        action: 'admin-user.password.update',
        date: expect.any(String),
        actor: {
          type: 'admin-user',
          user: { id: selfUser.id, email: self.email, name: 'Self Service' },
        },
        origin: 'admin-panel',
        resource: { type: 'admin-user', id: selfUser.id, email: self.email },
      });
      expectNoSecret(log, 'Password123', 'Password456');
    });
  });

  describe('admin-user.delete', () => {
    test('records a single delete', async () => {
      const invited = await inviteUser('leo@accounts-audit.test');
      await clearAuditLogs();

      const res = await rq({ url: `/admin/users/${invited.id}`, method: 'DELETE' });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('admin-user.delete');
      expect(log.user.id).toBe(actingAdminId);
      expect(log.payload).toEqual({
        action: 'admin-user.delete',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'admin-user', id: invited.id, email: 'leo@accounts-audit.test' },
      });
      expectNoSecret(log, invited.registrationToken);
      await expectNoLegacyLog();
    });

    test('records one row per account on a bulk delete', async () => {
      const first = await inviteUser('leo@accounts-audit.test');
      const second = await inviteUser('ana@accounts-audit.test', { firstname: 'Ana' });
      await clearAuditLogs();

      const res = await rq({
        url: '/admin/users/batch-delete',
        method: 'POST',
        body: { ids: [first.id, second.id] },
      });
      expect(res.statusCode).toBe(200);

      const logs = await findLogs('admin-user.delete');
      expect(logs.map((log) => log.payload.resource)).toEqual([
        { type: 'admin-user', id: first.id, email: 'leo@accounts-audit.test' },
        { type: 'admin-user', id: second.id, email: 'ana@accounts-audit.test' },
      ]);
      await expectNoLegacyLog();
    });
  });

  describe('admin-user.password-reset.create', () => {
    test('records the request for an active account with an unknown actor and the link expiry', async () => {
      const invited = await inviteUser('leo@accounts-audit.test');
      await rq({ url: `/admin/users/${invited.id}`, method: 'PUT', body: { isActive: true } });
      await clearAuditLogs();

      const res = await publicRq({
        url: '/admin/forgot-password',
        method: 'POST',
        body: { email: 'leo@accounts-audit.test' },
      });
      expect(res.statusCode).toBe(204);

      const logs = await waitForLog('admin-user.password-reset.create');
      expect(logs).toHaveLength(1);
      const [log] = logs;
      expect(log.user).toBeNull();
      expect(log.payload).toEqual({
        action: 'admin-user.password-reset.create',
        date: expect.any(String),
        actor: unknownActor,
        origin: 'admin-panel',
        resource: { type: 'admin-user', id: invited.id, email: 'leo@accounts-audit.test' },
        details: { expiresAt: expect.any(String) },
      });

      const row = await getUserRow(invited.id);
      expect(new Date(log.payload.details.expiresAt).getTime()).toBe(
        new Date(row.resetPasswordTokenExpiresAt).getTime()
      );
      expectNoSecret(log, row.resetPasswordToken);
      // The token assignment is a user update too, but not one the log tracks
      await expectNoLog('admin-user.update');
      await expectNoLegacyLog();
    });

    test('records nothing for an unknown email', async () => {
      const res = await publicRq({
        url: '/admin/forgot-password',
        method: 'POST',
        body: { email: 'nobody@accounts-audit.test' },
      });
      expect(res.statusCode).toBe(204);

      expect(await waitForLog('admin-user.password-reset.create', 5)).toHaveLength(0);
    });
  });

  describe('admin-user.password-reset.confirm', () => {
    const requestReset = async (email: string, id: number) => {
      await publicRq({ url: '/admin/forgot-password', method: 'POST', body: { email } });
      await waitForLog('admin-user.password-reset.create');
      return (await getUserRow(id)).resetPasswordToken as string;
    };

    test('records the confirmed reset with an unknown actor and no password row', async () => {
      const invited = await inviteUser('leo@accounts-audit.test');
      await rq({ url: `/admin/users/${invited.id}`, method: 'PUT', body: { isActive: true } });
      const resetPasswordToken = await requestReset('leo@accounts-audit.test', invited.id);
      await clearAuditLogs();

      const res = await publicRq({
        url: '/admin/reset-password',
        method: 'POST',
        body: { resetPasswordToken, password: 'Password456' },
      });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('admin-user.password-reset.confirm');
      expect(log.user).toBeNull();
      expect(log.payload).toEqual({
        action: 'admin-user.password-reset.confirm',
        date: expect.any(String),
        actor: unknownActor,
        origin: 'admin-panel',
        resource: { type: 'admin-user', id: invited.id, email: 'leo@accounts-audit.test' },
      });
      expectNoSecret(log, resetPasswordToken, 'Password456');
      await expectNoLog('admin-user.password.update');
      await expectNoLog('admin-user.update');
      await expectNoLegacyLog();
    });

    test('records nothing for an invalid reset token', async () => {
      const res = await publicRq({
        url: '/admin/reset-password',
        method: 'POST',
        body: { resetPasswordToken: 'not-a-token', password: 'Password456' },
      });
      expect(res.statusCode).toBe(400);

      await expectNoLog('admin-user.password-reset.confirm');
    });
  });
});
