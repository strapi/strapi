'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import { base32Decode, generateTotp } from '@strapi/utils';

jest.setTimeout(300_000);

const DAY = 24 * 60 * 60 * 1000;
const TRUST_COOKIE = 'strapi_admin_mfa_trust';
const REFRESH_COOKIE = 'strapi_admin_refresh';

const totpFor = (secret: string) =>
  generateTotp({ secret: base32Decode(secret), step: 30, digits: 6 });

/** The account-wide replay guard consumes a TOTP step per accepted code; wait out the current one. */
const waitForNextTotpStep = () =>
  new Promise((resolve) => setTimeout(resolve, (31 - (Math.floor(Date.now() / 1000) % 30)) * 1000));

const setCookieFor = (res: any, name: string): string | undefined =>
  (res.headers['set-cookie'] as string[] | undefined)?.find((c) => c.startsWith(`${name}=`));

const cookiePair = (raw: string): string => raw.split(';')[0];

const cookieAttr = (raw: string, attr: string): string | undefined =>
  raw
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith(`${attr.toLowerCase()}`))
    ?.split('=')
    .slice(1)
    .join('=');

describe('Admin MFA trusted devices', () => {
  let strapi: any;
  let rq: any; // super admin, authenticated
  let utils: any;
  let editorRole: any;
  let editor: any;
  let editorPassword = 'Password123';
  let editorRecoveryCodes: string[] = [];
  let superAdminId: number;
  let superAdminSecret: string;

  const nextRecoveryCode = () => {
    const code = editorRecoveryCodes.shift();
    if (!code) throw new Error('test budget of recovery codes exhausted');
    return code;
  };

  const loginEditor = (
    headers: Record<string, string> = {},
    extraBody: Record<string, unknown> = {}
  ) =>
    createRequest({ strapi }).post('/admin/login', {
      body: { email: editor.email, password: editorPassword, ...extraBody },
      headers,
    });

  /** Completes a challenge with the editor's next recovery code. */
  const completeChallenge = (challengeToken: string, body: Record<string, unknown> = {}) =>
    createRequest({ strapi }).post('/admin/login/mfa', {
      body: { challengeToken, code: nextRecoveryCode(), ...body },
    });

  /** Challenge then complete with `trustDevice: true`; returns the trust cookie pair. */
  const grantTrust = async (): Promise<string> => {
    const challenge = await loginEditor();
    expect(challenge.body.data.mfaRequired).toBe(true);
    const res = await completeChallenge(challenge.body.data.challengeToken, { trustDevice: true });
    expect(res.statusCode).toBe(200);
    const raw = setCookieFor(res, TRUST_COOKIE);
    expect(raw).toBeDefined();
    return cookiePair(raw!);
  };

  const editorBearer = async () => {
    const { token } = await utils.login({ email: editor.email });
    return { Authorization: `Bearer ${token}` };
  };

  const trustedRows = () =>
    strapi.db.query('admin::mfa-trusted-device').findMany({ where: { userId: String(editor.id) } });

  const putSettings = (body: Record<string, unknown>) =>
    rq({ url: '/admin/security-settings', method: 'PUT', body });

  /**
   * The shared-app reset: security settings back to their defaults, no role flagged, the super
   * admin's second factor and trusted devices removed. Goes through the same store and the same
   * service the server uses, so it cannot drift from the real defaults.
   */
  const resetSharedMfaState = async () => {
    await strapi.store({ type: 'core', name: 'admin' }).set({
      key: 'security-settings',
      value: {
        mfa: { mode: 'optional', graceDays: 7 },
        trustedDevices: { enabled: true, days: 30 },
      },
    });
    await strapi.db.query('admin::role').updateMany({ where: {}, data: { mfaRequired: false } });
    await strapi.service('admin::mfa').disable(String(superAdminId));
    await strapi.db.query('admin::mfa-trusted-device').deleteMany({ where: {} });
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      async bootstrap({ strapi: s }: { strapi: any }) {
        s.config.set('features.future.unstableAdminMfa', true);
        s.config.set('admin.rateLimit.enabled', false);
      },
    });
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    const me = await rq({ url: '/admin/users/me', method: 'GET' });
    superAdminId = me.body.data.id;

    // `yarn test:api` runs every admin suite --runInBand against one shared SQLite app, and a
    // sibling suite (admin-mfa-enforcement) leaves the super admin enrolled with the mode raised.
    // Start from the exact state this suite asserts, whatever ran before.
    await resetSharedMfaState();

    editorRole = await utils.createRole({
      name: 'mfa_trusted_devices_editor',
      description: 'test',
    });
    editor = await utils.createUser({
      email: 'mfa-trusted-devices-editor@strapi.io',
      firstname: 'Ed',
      lastname: 'Itor',
      password: editorPassword,
      roles: [editorRole.id],
    });

    // Enrol the editor over HTTP; keep the recovery codes for every later challenge.
    const headers = await editorBearer();
    const enrol = await createRequest({ strapi }).post('/admin/mfa/enrol', {
      body: { password: editorPassword },
      headers,
    });
    expect(enrol.statusCode).toBe(200);
    const verify = await createRequest({ strapi }).post('/admin/mfa/enrol/verify', {
      body: { code: totpFor(enrol.body.data.secret) },
      headers,
    });
    expect(verify.statusCode).toBe(200);
    editorRecoveryCodes = verify.body.data.recoveryCodes;
    expect(editorRecoveryCodes).toHaveLength(10);
  });

  afterAll(async () => {
    await utils.deleteUsersById([editor.id]);
    await utils.deleteRolesById([editorRole.id]);
    await resetSharedMfaState();
    await strapi.destroy();
  });

  test('defaults: trusted devices enabled for 30 days', async () => {
    const res = await rq({ url: '/admin/security-settings', method: 'GET' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.trustedDevices).toEqual({ enabled: true, days: 30 });
  });

  test('PUT is per object: each key replaces its own object and leaves the other alone', async () => {
    const mfaOnly = await putSettings({
      mfa: { mode: 'optional', graceDays: 7, requiredRoles: [] },
    });
    expect(mfaOnly.statusCode).toBe(200);
    expect(mfaOnly.body.data.trustedDevices).toEqual({ enabled: true, days: 30 });

    const lower = await putSettings({ trustedDevices: { enabled: true, days: 7 } });
    expect(lower.statusCode).toBe(200);
    expect(lower.body.data).toEqual({
      mfa: { mode: 'optional', graceDays: 7, requiredRoles: [] },
      trustedDevices: { enabled: true, days: 7 },
    });

    const neither = await putSettings({ password: superAdmin.loginInfo.password });
    expect(neither.statusCode).toBe(400);

    // Raising is a downgrade: the (unenrolled) super admin needs the password.
    const raiseNoAuth = await putSettings({ trustedDevices: { enabled: true, days: 30 } });
    expect(raiseNoAuth.statusCode).toBe(400);
    const raise = await putSettings({
      trustedDevices: { enabled: true, days: 30 },
      password: superAdmin.loginInfo.password,
    });
    expect(raise.statusCode).toBe(200);
    expect(raise.body.data.trustedDevices).toEqual({ enabled: true, days: 30 });
  });

  test.each([[0], [91], [7.5]])('days %p is rejected', async (days) => {
    const res = await putSettings({ trustedDevices: { enabled: true, days } });
    expect(res.statusCode).toBe(400);
  });

  test('the challenge response advertises the trust period', async () => {
    const res = await loginEditor();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.mfaRequired).toBe(true);
    expect(res.body.data.trustedDeviceDays).toBe(30);
    expect(setCookieFor(res, TRUST_COOKIE)).toBeUndefined();
  });

  describe('a trusted browser', () => {
    let trustCookie: string;
    let rowId: string;

    test('completing the challenge with trustDevice sets an httpOnly cookie scoped like the refresh cookie', async () => {
      const challenge = await loginEditor();
      const res = await completeChallenge(challenge.body.data.challengeToken, {
        trustDevice: true,
      });
      expect(res.statusCode).toBe(200);
      expect(typeof res.body.data.token).toBe('string');

      const raw = setCookieFor(res, TRUST_COOKIE)!;
      expect(raw).toBeDefined();
      expect(raw).toMatch(/httponly/i);
      expect(cookieAttr(raw, 'path')).toBe('/admin');
      const expires = new Date(cookieAttr(raw, 'expires')!).getTime();
      expect(expires).toBeGreaterThan(Date.now() + 29 * DAY);
      expect(expires).toBeLessThan(Date.now() + 31 * DAY);
      expect(setCookieFor(res, REFRESH_COOKIE)).toBeDefined();
      trustCookie = cookiePair(raw);

      const rows = await trustedRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].tokenHash).not.toBe(trustCookie.split('=')[1]);
      expect(rows[0].lastUsedAt).toBeNull();
      rowId = String(rows[0].id);
    });

    test('logs in with the password alone and stamps lastUsedAt', async () => {
      const res = await loginEditor({ Cookie: trustCookie });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.mfaRequired).toBeUndefined();
      expect(typeof res.body.data.token).toBe('string');
      expect(setCookieFor(res, REFRESH_COOKIE)).toBeDefined();

      const [row] = await trustedRows();
      expect(row.lastUsedAt).not.toBeNull();
    });

    test('the list marks the presenting browser current and never carries the hash', async () => {
      const headers = await editorBearer();
      const withCookie = await createRequest({ strapi }).get('/admin/mfa/trusted-devices', {
        headers: { ...headers, Cookie: trustCookie },
      });
      expect(withCookie.statusCode).toBe(200);
      expect(withCookie.body.data).toHaveLength(1);
      expect(withCookie.body.data[0]).toMatchObject({
        id: rowId,
        current: true,
        lastUsedAt: expect.any(String),
      });
      expect(withCookie.body.data[0]).not.toHaveProperty('tokenHash');
      expect(JSON.stringify(withCookie.body)).not.toContain(trustCookie.split('=')[1]);

      const anonymous = await createRequest({ strapi }).get('/admin/mfa/trusted-devices', {
        headers,
      });
      expect(anonymous.body.data[0].current).toBe(false);

      const me = await createRequest({ strapi }).get('/admin/mfa/me', { headers });
      expect(me.body.data.trustedDevicesEnabled).toBe(true);
    });

    test("another enrolled user's login ignores this cookie and clears it", async () => {
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

      const res = await createRequest({ strapi }).post('/admin/login', {
        body: superAdmin.loginInfo,
        headers: { Cookie: trustCookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.mfaRequired).toBe(true);
      expect(setCookieFor(res, TRUST_COOKIE)).toMatch(new RegExp(`^${TRUST_COOKIE}=;`));

      // The editor's row is untouched.
      expect(await trustedRows()).toHaveLength(1);
    });

    test('/reset-password ignores the trust cookie and still advertises the trust period', async () => {
      await strapi.db.query('admin::user').update({
        where: { id: editor.id },
        data: {
          resetPasswordToken: 'trusted-devices-reset-token',
          resetPasswordTokenExpiresAt: new Date(Date.now() + 60_000),
        },
      });

      const res = await createRequest({ strapi }).post('/admin/reset-password', {
        body: { resetPasswordToken: 'trusted-devices-reset-token', password: 'NewPassword456' },
        headers: { Cookie: trustCookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.mfaRequired).toBe(true);
      expect(res.body.data.trustedDeviceDays).toBe(30);
      editorPassword = 'NewPassword456';

      // Trust survives a password reset by design; the new password is still required.
      const again = await loginEditor({ Cookie: trustCookie });
      expect(again.body.data.mfaRequired).toBeUndefined();
      expect(typeof again.body.data.token).toBe('string');
    });

    test('revoking the current device clears the cookie and the next login is challenged again', async () => {
      const headers = await editorBearer();
      const revoke = await createRequest({ strapi }).delete(`/admin/mfa/trusted-devices/${rowId}`, {
        headers: { ...headers, Cookie: trustCookie },
      });
      expect(revoke.statusCode).toBe(204);
      expect(setCookieFor(revoke, TRUST_COOKIE)).toMatch(new RegExp(`^${TRUST_COOKIE}=;`));
      expect(await trustedRows()).toHaveLength(0);

      const res = await loginEditor({ Cookie: trustCookie });
      expect(res.body.data.mfaRequired).toBe(true);
      expect(setCookieFor(res, TRUST_COOKIE)).toMatch(new RegExp(`^${TRUST_COOKIE}=;`));
    });

    test('a foreign or malformed row id is a 404', async () => {
      const headers = await editorBearer();
      const unknown = await createRequest({ strapi }).delete('/admin/mfa/trusted-devices/999999', {
        headers,
      });
      expect(unknown.statusCode).toBe(404);
      const malformed = await createRequest({ strapi }).delete('/admin/mfa/trusted-devices/abc', {
        headers,
      });
      expect(malformed.statusCode).toBe(404);

      // Ownership, not just existence: a row that belongs to someone else is a 404 too, not merely
      // "not found for a made-up id".
      const foreignRow = await strapi.db.query('admin::mfa-trusted-device').create({
        data: {
          userId: String(superAdminId),
          tokenHash: 'not-a-real-hash-super-admin',
          deviceId: null,
          deviceName: null,
          expiresAt: new Date(Date.now() + DAY),
          lastUsedAt: null,
        },
      });
      const foreign = await createRequest({ strapi }).delete(
        `/admin/mfa/trusted-devices/${foreignRow.id}`,
        { headers }
      );
      expect(foreign.statusCode).toBe(404);
      expect(
        await strapi.db.query('admin::mfa-trusted-device').findOne({ where: { id: foreignRow.id } })
      ).not.toBeNull();
      await strapi.db
        .query('admin::mfa-trusted-device')
        .deleteMany({ where: { id: foreignRow.id } });
    });
  });

  test("lowering days below a trust's age kills it at the next login and deletes the row", async () => {
    const cookie = await grantTrust();
    const [row] = await trustedRows();
    await strapi.db.query('admin::mfa-trusted-device').update({
      where: { id: row.id },
      data: { createdAt: new Date(Date.now() - 10 * DAY) },
    });

    const lower = await putSettings({ trustedDevices: { enabled: true, days: 7 } });
    expect(lower.statusCode).toBe(200);

    const res = await loginEditor({ Cookie: cookie });
    expect(res.body.data.mfaRequired).toBe(true);
    expect(await trustedRows()).toHaveLength(0);

    // Restore. The super admin is enrolled now, so a raise needs password and code.
    await waitForNextTotpStep();
    const restore = await putSettings({
      trustedDevices: { enabled: true, days: 30 },
      password: superAdmin.loginInfo.password,
      code: totpFor(superAdminSecret),
    });
    expect(restore.statusCode).toBe(200);
  });

  test('turning trusted devices off empties the table, ignores cookies and stops advertising trust', async () => {
    const cookie = await grantTrust();
    expect(await trustedRows()).toHaveLength(1);

    const off = await putSettings({ trustedDevices: { enabled: false, days: 30 } });
    expect(off.statusCode).toBe(200);
    expect(await trustedRows()).toHaveLength(0);

    const challenge = await loginEditor({ Cookie: cookie });
    expect(challenge.body.data.mfaRequired).toBe(true);
    expect(challenge.body.data.trustedDeviceDays).toBeNull();

    const completed = await completeChallenge(challenge.body.data.challengeToken, {
      trustDevice: true,
    });
    expect(completed.statusCode).toBe(200);
    expect(setCookieFor(completed, TRUST_COOKIE)).toBeUndefined();
    expect(await trustedRows()).toHaveLength(0);

    // Re-enable: a downgrade, password and code.
    await waitForNextTotpStep();
    const on = await putSettings({
      trustedDevices: { enabled: true, days: 30 },
      password: superAdmin.loginInfo.password,
      code: totpFor(superAdminSecret),
    });
    expect(on.statusCode).toBe(200);
  });

  test("an administrator lists and revokes another user's trusted devices; a plain user is refused", async () => {
    await grantTrust();

    const list = await rq({ url: `/admin/mfa/users/${editor.id}/trusted-devices`, method: 'GET' });
    expect(list.statusCode).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).not.toHaveProperty('current');
    expect(list.body.data[0]).not.toHaveProperty('tokenHash');

    const headers = await editorBearer();
    const refused = await createRequest({ strapi }).get(
      `/admin/mfa/users/${superAdminId}/trusted-devices`,
      { headers }
    );
    expect(refused.statusCode).toBe(403);

    const unknown = await rq({ url: '/admin/mfa/users/999999/trusted-devices', method: 'DELETE' });
    expect(unknown.statusCode).toBe(404);

    const revoke = await rq({
      url: `/admin/mfa/users/${editor.id}/trusted-devices`,
      method: 'DELETE',
    });
    expect(revoke.statusCode).toBe(204);
    expect(await trustedRows()).toHaveLength(0);

    const events = await strapi.db.query('admin::mfa-event').findMany({
      where: { userId: String(editor.id), type: 'device_trust_revoked' },
      orderBy: { id: 'desc' },
    });
    expect(events[0].metadata).toMatchObject({ count: 1, byUserId: String(superAdminId) });
  });

  test('revoke all clears the cookie', async () => {
    const cookie = await grantTrust();
    const headers = await editorBearer();

    const res = await createRequest({ strapi }).delete('/admin/mfa/trusted-devices', {
      headers: { ...headers, Cookie: cookie },
    });
    expect(res.statusCode).toBe(204);
    expect(setCookieFor(res, TRUST_COOKIE)).toMatch(new RegExp(`^${TRUST_COOKIE}=;`));
    expect(await trustedRows()).toHaveLength(0);
  });
});
