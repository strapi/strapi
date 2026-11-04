'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import { base32Decode, generateTotp } from '@strapi/utils';

import { resetSharedMfaState } from './utils/mfa-state';

jest.setTimeout(180_000);

const totpFor = (secret: string) =>
  generateTotp({ secret: base32Decode(secret), step: 30, digits: 6 });

/** A TOTP step is single use, so a test that needs a fresh code waits for the next one. */
const waitForNextTotpStep = () =>
  new Promise((resolve) => {
    setTimeout(resolve, (31 - (Math.floor(Date.now() / 1000) % 30)) * 1000);
  });

/**
 * The base factor over real HTTP. The enforcement, trusted-device and passkey suites all use it as
 * scaffolding, but none of them asserted it: the wrong-code response, recovery codes being single
 * use and dying on regeneration, the replay guard, challenge single use, notices, and disable.
 *
 * Runs top to bottom on one enrolled account; recovery codes are spent where a TOTP code would
 * force a 30-second wait.
 */
describe('Admin MFA: the TOTP factor end to end', () => {
  let strapi: any;
  let rq: any;
  let utils: any;
  let role: any;
  let user: any;
  let secret: string;
  let recoveryCodes: string[] = [];
  let superAdminId: number;
  const password = 'Password123';

  const nextRecoveryCode = () => {
    const code = recoveryCodes.shift();
    if (!code) throw new Error('test budget of recovery codes exhausted');
    return code;
  };

  const login = () =>
    createRequest({ strapi }).post('/admin/login', { body: { email: user.email, password } });

  const completeChallenge = (challengeToken: string, code: string) =>
    createRequest({ strapi }).post('/admin/login/mfa', { body: { challengeToken, code } });

  const bearer = async () => {
    const challenge = await login();
    const done = await completeChallenge(challenge.body.data.challengeToken, nextRecoveryCode());
    return { Authorization: `Bearer ${done.body.data.token}` };
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
    await resetSharedMfaState(strapi, { userIds: [superAdminId] });

    role = await utils.createRole({ name: 'mfa_totp_editor', description: 'test' });
    user = await utils.createUser({
      email: 'mfa-totp-editor@strapi.io',
      firstname: 'To',
      lastname: 'Tp',
      password,
      roles: [role.id],
    });
  });

  afterAll(async () => {
    await utils.deleteUsersById([user.id]);
    await utils.deleteRolesById([role.id]);
    await resetSharedMfaState(strapi, { userIds: [superAdminId] });
    await strapi.destroy();
  });

  test('enrols over HTTP and receives ten recovery codes', async () => {
    const first = await login();
    expect(first.statusCode).toBe(200);
    const headers = { Authorization: `Bearer ${first.body.data.token}` };

    const enrol = await createRequest({ strapi }).post('/admin/mfa/enrol', {
      body: { password },
      headers,
    });
    expect(enrol.statusCode).toBe(200);
    secret = enrol.body.data.secret;

    const verify = await createRequest({ strapi }).post('/admin/mfa/enrol/verify', {
      body: { code: totpFor(secret) },
      headers,
    });
    expect(verify.statusCode).toBe(200);
    recoveryCodes = verify.body.data.recoveryCodes;
    expect(recoveryCodes).toHaveLength(10);

    const me = await createRequest({ strapi }).get('/admin/mfa/me', { headers });
    expect(me.body.data.enabled).toBe(true);
  });

  test('a password login now answers with a challenge, not a session', async () => {
    const res = await login();

    expect(res.statusCode).toBe(200);
    expect(res.body.data.mfaRequired).toBe(true);
    expect(res.body.data.challengeToken).toEqual(expect.any(String));
    expect(res.body.data).not.toHaveProperty('token');
  });

  test('a wrong code is refused with a translatable code, and the challenge survives it', async () => {
    const challenge = await login();
    const { challengeToken } = challenge.body.data;

    const wrong = await completeChallenge(challengeToken, '000000');
    expect(wrong.statusCode).toBe(400);
    expect(wrong.body.error.details).toEqual({ code: 'MFA_INVALID_CODE' });

    const right = await completeChallenge(challengeToken, nextRecoveryCode());
    expect(right.statusCode).toBe(200);
    expect(right.body.data.token).toEqual(expect.any(String));
  });

  test('a TOTP code completes a challenge once, and its step cannot be replayed', async () => {
    // Enrolment consumed the step it verified on.
    await waitForNextTotpStep();
    const code = totpFor(secret);

    const first = await login();
    const accepted = await completeChallenge(first.body.data.challengeToken, code);
    expect(accepted.statusCode).toBe(200);

    const second = await login();
    const replayed = await completeChallenge(second.body.data.challengeToken, code);
    expect(replayed.statusCode).toBe(400);
  });

  test('a recovery code works once', async () => {
    const code = nextRecoveryCode();

    const first = await login();
    expect((await completeChallenge(first.body.data.challengeToken, code)).statusCode).toBe(200);

    const second = await login();
    expect((await completeChallenge(second.body.data.challengeToken, code)).statusCode).toBe(400);
  });

  test('a challenge is single use, even after it succeeded', async () => {
    const challenge = await login();
    const { challengeToken } = challenge.body.data;

    expect((await completeChallenge(challengeToken, nextRecoveryCode())).statusCode).toBe(200);
    expect((await completeChallenge(challengeToken, nextRecoveryCode())).statusCode).toBe(400);
  });

  test('regenerating recovery codes kills every old one', async () => {
    const headers = await bearer();
    const stale = recoveryCodes[recoveryCodes.length - 1];

    const regenerated = await createRequest({ strapi }).post('/admin/mfa/recovery-codes', {
      body: { password, code: nextRecoveryCode() },
      headers,
    });
    expect(regenerated.statusCode).toBe(200);
    expect(regenerated.body.data.recoveryCodes).toHaveLength(10);

    const challenge = await login();
    expect((await completeChallenge(challenge.body.data.challengeToken, stale)).statusCode).toBe(
      400
    );

    recoveryCodes = regenerated.body.data.recoveryCodes;
  });

  test('a failed code reaches the account holder as a notice, and can be marked seen', async () => {
    // Signed in before the failure, as the holder would be: a login that began after an event may
    // not dismiss it while an older one is live (the next tests cover that rule), and the earlier
    // tests' logins are still live, so their notices are cleared first.
    await strapi.db
      .query('admin::mfa-event')
      .updateMany({ where: { userId: String(user.id) }, data: { seenAt: new Date() } });
    const headers = await bearer();
    const challenge = await login();
    await completeChallenge(challenge.body.data.challengeToken, '000000');

    const notices = await createRequest({ strapi }).get('/admin/mfa/notices', { headers });
    expect(notices.statusCode).toBe(200);
    expect(notices.body.data.map((n: any) => n.type)).toContain('challenge_failed');

    const seen = await createRequest({ strapi }).post('/admin/mfa/notices/seen', {
      body: {},
      headers,
    });
    expect(seen.statusCode).toBe(204);
    const after = await createRequest({ strapi }).get('/admin/mfa/notices', { headers });
    expect(after.body.data).toEqual([]);
  });

  test("a session is not notified of its own login, and clearing its notices leaves the other session's", async () => {
    // The previous test's session cleared only what it could see, which leaves its own login
    // unseen for every other session; start from nothing.
    await strapi.db
      .query('admin::mfa-event')
      .updateMany({ where: { userId: String(user.id) }, data: { seenAt: new Date() } });
    // Each login spends a recovery code, so each records one `recovery_code_used`.
    const sessionA = await bearer();
    const sessionB = await bearer();
    const typesFor = async (headers: Record<string, string>) =>
      (await createRequest({ strapi }).get('/admin/mfa/notices', { headers })).body.data.map(
        (n: any) => n.type
      );

    expect(await typesFor(sessionA)).toEqual(['recovery_code_used']);
    expect(await typesFor(sessionB)).toEqual(['recovery_code_used']);

    await createRequest({ strapi }).post('/admin/mfa/notices/seen', {
      body: {},
      headers: sessionA,
    });

    expect(await typesFor(sessionA)).toEqual([]);
    // Session B still has to hear about session A's login.
    expect(await typesFor(sessionB)).toEqual(['recovery_code_used']);

    await createRequest({ strapi }).post('/admin/mfa/notices/seen', {
      body: {},
      headers: sessionB,
    });
  });

  test('a login keeps recognising its own events after POST /admin/access-token rotates it', async () => {
    // Every refresh mints a new session id. Ownership is keyed on the login family, so the
    // rotated session must still not be told about its own login, and other logins still must.
    await strapi.db
      .query('admin::mfa-event')
      .updateMany({ where: { userId: String(user.id) }, data: { seenAt: new Date() } });
    const typesFor = async (headers: Record<string, string>) =>
      (await createRequest({ strapi }).get('/admin/mfa/notices', { headers })).body.data.map(
        (n: any) => n.type
      );

    const challenge = await login();
    const done = await completeChallenge(challenge.body.data.challengeToken, nextRecoveryCode());
    const cookie = (done.headers['set-cookie'] as unknown as string[])
      .find((c) => c.startsWith('strapi_admin_refresh='))!
      .split(';')[0];

    const refreshed = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookie },
    });
    expect(refreshed.statusCode).toBe(200);
    const rotated = { Authorization: `Bearer ${refreshed.body.data.token}` };

    expect(await typesFor(rotated)).toEqual([]);

    // Its "mark all seen" must not clear its own login for the others.
    await createRequest({ strapi }).post('/admin/mfa/notices/seen', { body: {}, headers: rotated });
    const other = await bearer();
    expect(await typesFor(other)).toEqual(['recovery_code_used']);
    await createRequest({ strapi }).post('/admin/mfa/notices/seen', { body: {}, headers: other });
  });

  test('a newer login cannot clear a notice from before it began while an older login is live', async () => {
    await strapi.db
      .query('admin::mfa-event')
      .updateMany({ where: { userId: String(user.id) }, data: { seenAt: new Date() } });
    const failedTypes = async (headers: Record<string, string>) =>
      (await createRequest({ strapi }).get('/admin/mfa/notices', { headers })).body.data
        .map((n: any) => n.type)
        .filter((type: string) => type === 'challenge_failed');

    const holder = await bearer();
    const challenge = await login();
    await completeChallenge(challenge.body.data.challengeToken, '000000');
    const newcomer = await bearer();

    await createRequest({ strapi }).post('/admin/mfa/notices/seen', {
      body: {},
      headers: newcomer,
    });

    // The holder still sees the failed attempt the newcomer tried to dismiss, and can clear it.
    expect(await failedTypes(holder)).toEqual(['challenge_failed']);
    await createRequest({ strapi }).post('/admin/mfa/notices/seen', { body: {}, headers: holder });
    expect(await failedTypes(holder)).toEqual([]);
  });

  test('a password reset commits only once the second factor passes', async () => {
    // Someone holding only the mailbox must not be able to change the password, or sign the holder
    // out, of an account whose second factor they do not have.
    const stageReset = async (token: string, newPassword: string) => {
      await strapi.db.query('admin::user').update({
        where: { id: user.id },
        data: {
          resetPasswordToken: token,
          resetPasswordTokenExpiresAt: new Date(Date.now() + 60_000),
        },
      });
      return createRequest({ strapi }).post('/admin/reset-password', {
        body: { resetPasswordToken: token, password: newPassword },
      });
    };
    const loginWith = (pw: string) =>
      createRequest({ strapi }).post('/admin/login', { body: { email: user.email, password: pw } });

    const holder = await bearer();
    const staged = await stageReset('totp-reset-one', 'Changed456');
    expect(staged.statusCode).toBe(200);
    expect(staged.body.data.mfaRequired).toBe(true);

    // Nothing changed yet: the old password still logs in, the new one does not, and the holder's
    // session still works.
    expect((await loginWith(password)).body.data.mfaRequired).toBe(true);
    expect((await loginWith('Changed456')).statusCode).toBe(400);
    expect(
      (await createRequest({ strapi }).get('/admin/mfa/me', { headers: holder })).statusCode
    ).toBe(200);

    // The factor commits it: the new password works, the old one does not, sessions are gone.
    // TOTP codes here, not recovery codes: the suite's budget of those is spoken for.
    await waitForNextTotpStep();
    const done = await completeChallenge(staged.body.data.challengeToken, totpFor(secret));
    expect(done.statusCode).toBe(200);
    expect((await loginWith('Changed456')).body.data.mfaRequired).toBe(true);
    expect((await loginWith(password)).statusCode).toBe(400);
    expect(
      (await createRequest({ strapi }).get('/admin/mfa/me', { headers: holder })).statusCode
    ).toBe(401);

    // Put the suite's password back the same way, so the tests after this one are unaffected.
    const back = await stageReset('totp-reset-two', password);
    await waitForNextTotpStep();
    expect(
      (await completeChallenge(back.body.data.challengeToken, totpFor(secret))).statusCode
    ).toBe(200);
  }, 120_000);

  test('disabling needs the password and a code, then login stops asking', async () => {
    const headers = await bearer();

    const noCode = await createRequest({ strapi }).post('/admin/mfa/disable', {
      body: { password },
      headers,
    });
    expect(noCode.statusCode).toBe(400);

    const disabled = await createRequest({ strapi }).post('/admin/mfa/disable', {
      body: { password, code: nextRecoveryCode() },
      headers,
    });
    expect(disabled.statusCode).toBe(204);

    const res = await login();
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data).not.toHaveProperty('mfaRequired');
  });
});
