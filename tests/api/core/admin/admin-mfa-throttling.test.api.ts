'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import { base32Decode, generateTotp } from '@strapi/utils';

import { resetSharedMfaState } from './utils/mfa-state';

jest.setTimeout(180_000);

const totpFor = (secret: string) =>
  generateTotp({ secret: base32Decode(secret), step: 30, digits: 6 });

/**
 * Low enough that a test reaches it in a handful of requests, high enough that the few password
 * logins each account makes on `/login` -- which shares the config -- never meet it, so a 429
 * from the account throttle below cannot be mistaken for the limiter's.
 */
const LIMIT = 5;

/**
 * Rate limiting and throttling over real HTTP. Every other MFA suite turns the limiter off, and
 * the route ceilings were only ever asserted as config, so nothing proved a request is actually
 * refused, that the per-challenge and per-account caps hold, or that the limiter's key is the
 * account rather than the address.
 */
describe('Admin MFA: throttling over HTTP', () => {
  let strapi: any;
  let rq: any;
  let utils: any;
  let role: any;
  let superAdminId: number;
  const password = 'Password123';
  const accounts: Record<string, { user: any; recoveryCodes: string[] }> = {};

  const login = (email: string) =>
    createRequest({ strapi }).post('/admin/login', { body: { email, password } });

  const completeChallenge = (challengeToken: string, code: string) =>
    createRequest({ strapi }).post('/admin/login/mfa', { body: { challengeToken, code } });

  /** Creates an account and enrols it, keeping its recovery codes. */
  const enrolled = async (key: string) => {
    const user = await utils.createUser({
      email: `mfa-throttle-${key}@strapi.io`,
      firstname: 'Throttle',
      lastname: key,
      password,
      roles: [role.id],
    });
    const first = await login(user.email);
    const headers = { Authorization: `Bearer ${first.body.data.token}` };
    const enrol = await createRequest({ strapi }).post('/admin/mfa/enrol', {
      body: { password },
      headers,
    });
    const verify = await createRequest({ strapi }).post('/admin/mfa/enrol/verify', {
      body: { code: totpFor(enrol.body.data.secret) },
      headers,
    });
    accounts[key] = { user, recoveryCodes: verify.body.data.recoveryCodes };
    return accounts[key];
  };

  const bearerFor = async (key: string) => {
    const account = accounts[key];
    const challenge = await login(account.user.email);
    const done = await completeChallenge(
      challenge.body.data.challengeToken,
      account.recoveryCodes.shift()!
    );
    return { Authorization: `Bearer ${done.body.data.token}` };
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      async bootstrap({ strapi: s }: { strapi: any }) {
        s.config.set('features.future.unstableAdminMfa', true);
        s.config.set('admin.rateLimit', { enabled: true, max: LIMIT, interval: { min: 5 } });
      },
    });
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    const me = await rq({ url: '/admin/users/me', method: 'GET' });
    superAdminId = me.body.data.id;
    await resetSharedMfaState(strapi, { userIds: [superAdminId] });

    role = await utils.createRole({ name: 'mfa_throttle_editor', description: 'test' });
    await enrolled('alpha');
    await enrolled('beta');
    await enrolled('gamma');
    await enrolled('delta');
  });

  afterAll(async () => {
    await utils.deleteUsersById(Object.values(accounts).map(({ user }) => user.id));
    await utils.deleteRolesById([role.id]);
    await resetSharedMfaState(strapi, { userIds: [superAdminId] });
    await strapi.destroy();
  });

  test('a credential route refuses the attempt past the limit with 429', async () => {
    const headers = await bearerFor('alpha');
    const disable = () =>
      createRequest({ strapi }).post('/admin/mfa/disable', {
        body: { password: 'wrong-password', code: '000000' },
        headers,
      });

    const statuses: number[] = [];
    for (let i = 0; i <= LIMIT; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      statuses.push((await disable()).statusCode);
    }

    expect(statuses.slice(0, LIMIT).every((status) => status === 400)).toBe(true);
    expect(statuses[LIMIT]).toBe(429);
  });

  /**
   * With a session, the limiter keys on the account and the route. Keyed on the address -- as it
   * was -- every administrator behind one office NAT shared a bucket and locked each other out.
   */
  test('another account behind the same address still has its own allowance', async () => {
    const headers = await bearerFor('beta');

    const res = await createRequest({ strapi }).post('/admin/mfa/disable', {
      body: { password: 'wrong-password', code: '000000' },
      headers,
    });

    expect(res.statusCode).toBe(400);
  });

  test('a challenge is destroyed after its attempt cap, so a correct code no longer works', async () => {
    const account = accounts.gamma;
    const challenge = await login(account.user.email);
    const { challengeToken } = challenge.body.data;

    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const wrong = await completeChallenge(challengeToken, '000000');
      expect(wrong.statusCode).toBe(400);
    }

    const right = await completeChallenge(challengeToken, account.recoveryCodes.shift()!);
    expect(right.statusCode).toBe(400);
  });

  /**
   * Without an account-wide cap the per-challenge one is a speed bump: a fresh challenge resets
   * it. Ten failures across challenges throttle the account itself.
   */
  test('failures across fresh challenges throttle the account itself', async () => {
    const account = accounts.delta;

    for (let round = 0; round < 2; round += 1) {
      // eslint-disable-next-line no-await-in-loop
      const challenge = await login(account.user.email);
      for (let i = 0; i < 5; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await completeChallenge(challenge.body.data.challengeToken, '000000');
      }
    }

    const throttled = await login(account.user.email);
    expect(throttled.statusCode).toBe(429);
  });
});
