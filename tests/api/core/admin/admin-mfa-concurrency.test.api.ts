'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import { base32Decode, generateTotp } from '@strapi/utils';

import { resetSharedMfaState } from './utils/mfa-state';

jest.setTimeout(180_000);

const totpFor = (secret: string) =>
  generateTotp({ secret: base32Decode(secret), step: 30, digits: 6 });

const waitForNextTotpStep = () =>
  new Promise((resolve) => {
    setTimeout(resolve, (31 - (Math.floor(Date.now() / 1000) % 30)) * 1000);
  });

const okCount = (responses: Array<{ statusCode: number }>) =>
  responses.filter((res) => res.statusCode === 200).length;

/**
 * Every single-use guarantee in the feature -- a challenge, a recovery code, a TOTP step, a pending
 * enrolment -- is a conditional UPDATE or DELETE whose affected-row count decides who wins. The
 * unit tests prove the service issues those statements against a hand-written in-memory store;
 * this proves the statements hold against a real database, under requests that actually race.
 *
 * The API generator is SQLite-only, so this exercises SQLite's semantics. Postgres and MySQL --
 * where MySQL reports changed rather than matched rows -- still need the CI database legs.
 */
describe('Admin MFA: single use under concurrent requests', () => {
  let strapi: any;
  let rq: any;
  let utils: any;
  let role: any;
  let user: any;
  let secret: string;
  let recoveryCodes: string[] = [];
  let superAdminId: number;
  const password = 'Password123';

  const login = () =>
    createRequest({ strapi }).post('/admin/login', { body: { email: user.email, password } });

  const completeChallenge = (challengeToken: string, code: string) =>
    createRequest({ strapi }).post('/admin/login/mfa', { body: { challengeToken, code } });

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

    role = await utils.createRole({ name: 'mfa_concurrency_editor', description: 'test' });
    user = await utils.createUser({
      email: 'mfa-concurrency-editor@strapi.io',
      firstname: 'Con',
      lastname: 'Current',
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

  test('two verifications of one pending enrolment: exactly one completes it', async () => {
    const first = await login();
    const headers = { Authorization: `Bearer ${first.body.data.token}` };
    const enrol = await createRequest({ strapi }).post('/admin/mfa/enrol', {
      body: { password },
      headers,
    });
    secret = enrol.body.data.secret;
    const code = totpFor(secret);

    const verify = () =>
      createRequest({ strapi }).post('/admin/mfa/enrol/verify', { body: { code }, headers });
    const results = await Promise.all([verify(), verify()]);

    expect(okCount(results)).toBe(1);
    recoveryCodes = results.find((res) => res.statusCode === 200)!.body.data.recoveryCodes;
    expect(recoveryCodes).toHaveLength(10);
  });

  test('two completions of one challenge: exactly one session', async () => {
    const challenge = await login();
    const { challengeToken } = challenge.body.data;
    const [a, b] = [recoveryCodes.shift()!, recoveryCodes.shift()!];

    const results = await Promise.all([
      completeChallenge(challengeToken, a),
      completeChallenge(challengeToken, b),
    ]);

    expect(okCount(results)).toBe(1);
  });

  test('one recovery code on two challenges: it is spent exactly once', async () => {
    const [first, second] = await Promise.all([login(), login()]);
    const code = recoveryCodes.shift()!;

    const results = await Promise.all([
      completeChallenge(first.body.data.challengeToken, code),
      completeChallenge(second.body.data.challengeToken, code),
    ]);

    expect(okCount(results)).toBe(1);
  });

  test('one TOTP code on two challenges: its step is consumed exactly once', async () => {
    await waitForNextTotpStep();
    const [first, second] = await Promise.all([login(), login()]);
    const code = totpFor(secret);

    const results = await Promise.all([
      completeChallenge(first.body.data.challengeToken, code),
      completeChallenge(second.body.data.challengeToken, code),
    ]);

    expect(okCount(results)).toBe(1);
  });

  /**
   * A required user's first sessions stamp the grace deadline. Two at once must agree on one
   * deadline rather than each stamping its own, or the later one silently extends the grace.
   */
  test('two first logins for a newly required account stamp one grace deadline', async () => {
    const other = await utils.createUser({
      email: 'mfa-concurrency-required@strapi.io',
      firstname: 'Re',
      lastname: 'Quired',
      password,
      roles: [role.id],
    });
    try {
      await strapi.store({ type: 'core', name: 'admin' }).set({
        key: 'security-settings',
        value: {
          mfa: { mode: 'required', graceDays: 7 },
          trustedDevices: { enabled: true, days: 30 },
          passkeys: { enabled: true },
        },
      });

      const signIn = () =>
        createRequest({ strapi }).post('/admin/login', { body: { email: other.email, password } });
      const results = await Promise.all([signIn(), signIn()]);

      expect(okCount(results)).toBe(2);
      const stamps = results.map((res) => res.body.data.mfaGraceUntil);
      expect(stamps[0]).toEqual(expect.any(String));
      expect(stamps[1]).toBe(stamps[0]);

      const row = await strapi.db
        .query('admin::user')
        .findOne({ where: { id: other.id }, select: ['mfaGraceUntil'] });
      expect(new Date(row.mfaGraceUntil).toISOString()).toBe(stamps[0]);
    } finally {
      await resetSharedMfaState(strapi, { userIds: [superAdminId] });
      await utils.deleteUsersById([other.id]);
    }
  });
});
