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
    const challenge = await login();
    await completeChallenge(challenge.body.data.challengeToken, '000000');

    const headers = await bearer();
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
