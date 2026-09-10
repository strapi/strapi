'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import { base32Decode, generateTotp } from '@strapi/utils';

jest.setTimeout(120_000);

const totpFor = (secret: string) =>
  generateTotp({ secret: base32Decode(secret), step: 30, digits: 6 });

describe('Admin MFA enforcement', () => {
  let strapi: any;
  let rq: any; // super admin, authenticated
  let utils: any;
  let editorRole: any;
  let editor: any;
  const editorPassword = 'Password123';

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      async bootstrap({ strapi: s }: { strapi: any }) {
        s.config.set('features.future.unstableAdminMfa', true);
        s.config.set('admin.rateLimit.enabled', false);
      },
    });
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    editorRole = await utils.createRole({ name: 'mfa_enforcement_editor', description: 'test' });
    editor = await utils.createUser({
      email: 'mfa-enforcement-editor@strapi.io',
      firstname: 'Ed',
      lastname: 'Itor',
      password: editorPassword,
      roles: [editorRole.id],
    });
  });

  afterAll(async () => {
    await utils.deleteUsersById([editor.id]);
    await utils.deleteRolesById([editorRole.id]);
    await strapi.destroy();
  });

  const login = (email: string, password: string) =>
    createRequest({ strapi }).post('/admin/login', { body: { email, password } });

  const setGrace = (userId: number, when: Date | null) =>
    strapi.db.query('admin::user').update({ where: { id: userId }, data: { mfaGraceUntil: when } });

  test('defaults: optional, 7 days, no required roles', async () => {
    const res = await rq({ url: '/admin/security-settings', method: 'GET' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({
      mfa: { mode: 'optional', graceDays: 7, requiredRoles: [] },
      trustedDevices: { enabled: true, days: 30 },
      passkeys: { enabled: true },
    });
  });

  test('the role API rejects mfaRequired', async () => {
    const res = await rq({
      url: `/admin/roles/${editorRole.id}`,
      method: 'PUT',
      body: { name: 'mfa_enforcement_editor', description: 'x', mfaRequired: true },
    });
    expect(res.statusCode).toBe(400);
  });

  test('an unenrolled super admin cannot switch to required', async () => {
    const res = await rq({
      url: '/admin/security-settings',
      method: 'PUT',
      body: { mfa: { mode: 'required', graceDays: 7, requiredRoles: [] } },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toBe(
      'Enrol in two-factor authentication before requiring it for others'
    );
  });

  test('graceDays outside 1..30 is rejected', async () => {
    const res = await rq({
      url: '/admin/security-settings',
      method: 'PUT',
      body: { mfa: { mode: 'optional', graceDays: 31, requiredRoles: [] } },
    });
    expect(res.statusCode).toBe(400);
  });

  describe('once the super admin is enrolled', () => {
    let superAdminSecret: string;

    beforeAll(async () => {
      const enrol = await rq({
        url: '/admin/mfa/enrol',
        method: 'POST',
        body: { password: superAdmin.loginInfo.password },
      });
      expect(enrol.statusCode).toBe(200);
      superAdminSecret = enrol.body.data.secret;
      const verify = await rq({
        url: '/admin/mfa/enrol/verify',
        method: 'POST',
        body: { code: totpFor(superAdminSecret) },
      });
      expect(verify.statusCode).toBe(200);
      expect(verify.body.data.replaced).toBe(false);
    });

    test("requiring the editor role starts a grace at the editor's next login", async () => {
      const put = await rq({
        url: '/admin/security-settings',
        method: 'PUT',
        body: { mfa: { mode: 'optional', graceDays: 2, requiredRoles: [String(editorRole.id)] } },
      });
      expect(put.statusCode).toBe(200);
      expect(put.body.data.mfa.requiredRoles).toEqual([String(editorRole.id)]);

      const res = await login(editor.email, editorPassword);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.mfaEnrolmentRequired).toBe(true);
      const graceUntil = new Date(res.body.data.mfaGraceUntil).getTime();
      expect(graceUntil).toBeGreaterThan(Date.now() + 47 * 60 * 60 * 1000);
      expect(graceUntil).toBeLessThan(Date.now() + 49 * 60 * 60 * 1000);

      const row = await strapi.db.query('admin::user').findOne({ where: { id: editor.id } });
      expect(new Date(row.mfaGraceUntil).getTime()).toBe(graceUntil);
    });

    test('the editor sees required and the deadline on /mfa/me', async () => {
      const { token } = await utils.login({ email: editor.email });
      const res = await createRequest({ strapi }).get('/admin/mfa/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.required).toBe(true);
      expect(typeof res.body.data.graceUntil).toBe('string');
    });

    test("a super admin with users.update sees the editor's enforcement state, never the secrets", async () => {
      const res = await rq({ url: `/admin/users/${editor.id}`, method: 'GET' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('mfaGraceUntil');
      expect(res.body.data).toHaveProperty('mfaLockedAt', null);
      expect(res.body.data).not.toHaveProperty('mfaSecret');
      expect(res.body.data).not.toHaveProperty('mfaPendingSecret');
    });

    test('an expired grace locks the editor at login with MfaLockedError (403) and kills sessions', async () => {
      const { token } = await utils.login({ email: editor.email });
      await setGrace(editor.id, new Date(Date.now() - 1000));

      const res = await login(editor.email, editorPassword);
      expect(res.statusCode).toBe(403);
      expect(res.body.error.name).toBe('MfaLockedError');

      const me = await createRequest({ strapi }).get('/admin/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(me.statusCode).toBe(401);
    });

    test('unlocking from the users API lets the editor in again with a fresh grace', async () => {
      const twice = await rq({ url: `/admin/mfa/users/${editor.id}/unlock`, method: 'POST' });
      expect(twice.statusCode).toBe(204);

      const again = await rq({ url: `/admin/mfa/users/${editor.id}/unlock`, method: 'POST' });
      expect(again.statusCode).toBe(400);

      const res = await login(editor.email, editorPassword);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.mfaEnrolmentRequired).toBe(true);
      expect(new Date(res.body.data.mfaGraceUntil).getTime()).toBeGreaterThan(Date.now());
    });

    test('the refresh exchange locks an expired grace: 401 and a cleared cookie', async () => {
      const loginRes = await login(editor.email, editorPassword);
      const cookie = (loginRes.headers['set-cookie'] as string[]).find((c) =>
        c.startsWith('strapi_admin_refresh=')
      );
      expect(cookie).toBeDefined();
      await setGrace(editor.id, new Date(Date.now() - 1000));

      const res = await createRequest({ strapi }).post('/admin/access-token', {
        headers: { Cookie: cookie!.split(';')[0] },
      });
      expect(res.statusCode).toBe(401);
      const cleared = (res.headers['set-cookie'] as string[] | undefined)?.find((c) =>
        c.startsWith('strapi_admin_refresh=;')
      );
      expect(cleared).toBeDefined();

      // Recover for the following tests.
      const unlock = await rq({ url: `/admin/mfa/users/${editor.id}/unlock`, method: 'POST' });
      expect(unlock.statusCode).toBe(204);
    });

    test('lowering the requirement needs password and code', async () => {
      const noAuth = await rq({
        url: '/admin/security-settings',
        method: 'PUT',
        body: { mfa: { mode: 'optional', graceDays: 2, requiredRoles: [] } },
      });
      expect(noAuth.statusCode).toBe(400);

      // A fresh TOTP step: the beforeAll enrolment verify already consumed the current one, and
      // the account-wide replay guard (cycle 1) means the same step's code can't be accepted twice.
      await new Promise((resolve) =>
        setTimeout(resolve, (31 - (Math.floor(Date.now() / 1000) % 30)) * 1000)
      );
      const withAuth = await rq({
        url: '/admin/security-settings',
        method: 'PUT',
        body: {
          mfa: { mode: 'optional', graceDays: 2, requiredRoles: [] },
          password: superAdmin.loginInfo.password,
          code: totpFor(superAdminSecret),
        },
      });
      expect(withAuth.statusCode).toBe(200);
      expect(withAuth.body.data.mfa.requiredRoles).toEqual([]);
    });

    test('increasing graceDays needs password and code', async () => {
      const noAuth = await rq({
        url: '/admin/security-settings',
        method: 'PUT',
        body: { mfa: { mode: 'optional', graceDays: 5, requiredRoles: [] } },
      });
      expect(noAuth.statusCode).toBe(400);

      await new Promise((resolve) =>
        setTimeout(resolve, (31 - (Math.floor(Date.now() / 1000) % 30)) * 1000)
      );
      const withAuth = await rq({
        url: '/admin/security-settings',
        method: 'PUT',
        body: {
          mfa: { mode: 'optional', graceDays: 5, requiredRoles: [] },
          password: superAdmin.loginInfo.password,
          code: totpFor(superAdminSecret),
        },
      });
      expect(withAuth.statusCode).toBe(200);
      expect(withAuth.body.data.mfa.graceDays).toBe(5);
    });

    test('the super admin can replace their authenticator with a recovery code', async () => {
      // A fresh code set: regenerate needs password + a code; wait for a new step first.
      await new Promise((resolve) =>
        setTimeout(resolve, (31 - (Math.floor(Date.now() / 1000) % 30)) * 1000)
      );
      const regen = await rq({
        url: '/admin/mfa/recovery-codes',
        method: 'POST',
        body: { password: superAdmin.loginInfo.password, code: totpFor(superAdminSecret) },
      });
      expect(regen.statusCode).toBe(200);
      const [recoveryCode] = regen.body.data.recoveryCodes;

      const enrol = await rq({
        url: '/admin/mfa/enrol',
        method: 'POST',
        body: { password: superAdmin.loginInfo.password, code: recoveryCode },
      });
      expect(enrol.statusCode).toBe(200);
      const newSecret = enrol.body.data.secret;
      expect(newSecret).not.toBe(superAdminSecret);

      await new Promise((resolve) =>
        setTimeout(resolve, (31 - (Math.floor(Date.now() / 1000) % 30)) * 1000)
      );
      const verify = await rq({
        url: '/admin/mfa/enrol/verify',
        method: 'POST',
        body: { code: totpFor(newSecret) },
      });
      expect(verify.statusCode).toBe(200);
      expect(verify.body.data.replaced).toBe(true);
      superAdminSecret = newSecret;
    });

    test('a required, enrolled user cannot disable', async () => {
      const put = await rq({
        url: '/admin/security-settings',
        method: 'PUT',
        body: { mfa: { mode: 'required', graceDays: 2, requiredRoles: [] } },
      });
      expect(put.statusCode).toBe(200);

      await new Promise((resolve) =>
        setTimeout(resolve, (31 - (Math.floor(Date.now() / 1000) % 30)) * 1000)
      );
      const res = await rq({
        url: '/admin/mfa/disable',
        method: 'POST',
        body: { password: superAdmin.loginInfo.password, code: totpFor(superAdminSecret) },
      });
      expect(res.statusCode).toBe(403);
      expect(res.body.error.name).toBe('MfaRequiredError');
    });
  });
});
