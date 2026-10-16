'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

import { resetSharedMfaState } from './utils/mfa-state';
import { createSoftwareAuthenticator } from './utils/software-authenticator';

jest.setTimeout(180_000);

const RP_ID = 'localhost';
const ORIGIN = 'http://localhost:1337';
const TRUST_COOKIE = 'strapi_admin_mfa_trust';

const setCookieFor = (res: any, name: string): string | undefined =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${name}=`));

/**
 * Passkeys against real cryptography. Every unit test mocks `@simplewebauthn/server`'s
 * verification, and the only real ceremonies were two Chromium e2e journeys, so a library upgrade
 * that changed behaviour rather than shape would pass CI. Here a software authenticator produces
 * real attestation and assertion responses, and the server verifies them for real -- including
 * the refusals: a replayed counter, a foreign origin, a foreign relying party, a duplicate
 * credential.
 */
describe('Admin MFA: passkeys verified against real cryptography', () => {
  let strapi: any;
  let rq: any;
  let utils: any;
  let role: any;
  let user: any;
  let recoveryCodes: string[] = [];
  let superAdminId: number;
  let headers: Record<string, string>;
  const password = 'Password123';
  const authenticator = createSoftwareAuthenticator({ rpId: RP_ID, origin: ORIGIN });

  const login = () =>
    createRequest({ strapi }).post('/admin/login', { body: { email: user.email, password } });

  /** A fresh challenge and the passkey options issued against it. */
  const passkeyChallenge = async () => {
    const challenge = await login();
    const { challengeToken } = challenge.body.data;
    const options = await createRequest({ strapi }).post('/admin/login/mfa/webauthn/options', {
      body: { challengeToken },
    });
    expect(options.statusCode).toBe(200);
    return { challengeToken, options: options.body.data };
  };

  const verifyAssertion = (challengeToken: string, assertion: unknown, extra = {}) =>
    createRequest({ strapi }).post('/admin/login/mfa/webauthn', {
      body: { challengeToken, assertion, ...extra },
    });

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      async bootstrap({ strapi: s }: { strapi: any }) {
        s.config.set('features.future.unstableAdminMfa', true);
        s.config.set('admin.rateLimit.enabled', false);
        s.config.set('admin.auth.mfa.webauthn.rpId', RP_ID);
        s.config.set('admin.auth.mfa.webauthn.origins', [ORIGIN]);
      },
    });
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    const me = await rq({ url: '/admin/users/me', method: 'GET' });
    superAdminId = me.body.data.id;
    await resetSharedMfaState(strapi, { userIds: [superAdminId] });

    role = await utils.createRole({ name: 'mfa_passkey_crypto_editor', description: 'test' });
    user = await utils.createUser({
      email: 'mfa-passkey-crypto@strapi.io',
      firstname: 'Pass',
      lastname: 'Key',
      password,
      roles: [role.id],
    });

    // TOTP is the mandatory base factor, so enrol it first.
    const first = await login();
    headers = { Authorization: `Bearer ${first.body.data.token}` };
    const enrol = await createRequest({ strapi }).post('/admin/mfa/enrol', {
      body: { password },
      headers,
    });
    const { base32Decode, generateTotp } = await import('@strapi/utils');
    const verify = await createRequest({ strapi }).post('/admin/mfa/enrol/verify', {
      body: {
        code: generateTotp({ secret: base32Decode(enrol.body.data.secret), step: 30, digits: 6 }),
      },
      headers,
    });
    recoveryCodes = verify.body.data.recoveryCodes;
  });

  afterAll(async () => {
    await utils.deleteUsersById([user.id]);
    await utils.deleteRolesById([role.id]);
    await resetSharedMfaState(strapi, { userIds: [superAdminId] });
    await strapi.destroy();
  });

  test('registers a real credential, and stores its public key', async () => {
    const options = await createRequest({ strapi }).post('/admin/mfa/passkeys/options', {
      body: { password, code: recoveryCodes.shift() },
      headers,
    });
    expect(options.statusCode).toBe(200);

    const registered = await createRequest({ strapi }).post('/admin/mfa/passkeys', {
      body: { name: 'Software key', registration: authenticator.register(options.body.data) },
      headers,
    });
    expect(registered.statusCode).toBe(200);
    expect(registered.body.data.name).toBe('Software key');

    const row = await strapi.db
      .query('admin::mfa-passkey')
      .findOne({ where: { userId: String(user.id) } });
    expect(row.credentialId).toBe(authenticator.credentialId);
    expect(row.publicKey).toEqual(expect.any(String));
  });

  test('refuses to register the same authenticator twice', async () => {
    const options = await createRequest({ strapi }).post('/admin/mfa/passkeys/options', {
      body: { password, code: recoveryCodes.shift() },
      headers,
    });

    const again = await createRequest({ strapi }).post('/admin/mfa/passkeys', {
      body: { name: 'Same key', registration: authenticator.register(options.body.data) },
      headers,
    });

    expect(again.statusCode).toBe(400);
    expect(
      await strapi.db.query('admin::mfa-passkey').count({ where: { userId: String(user.id) } })
    ).toBe(1);
  });

  test('a real assertion completes the login challenge', async () => {
    const { challengeToken, options } = await passkeyChallenge();

    const res = await verifyAssertion(challengeToken, authenticator.authenticate(options));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  test('the trust grant is factor-agnostic: a passkey login can trust the browser', async () => {
    const { challengeToken, options } = await passkeyChallenge();

    const res = await verifyAssertion(challengeToken, authenticator.authenticate(options), {
      trustDevice: true,
    });

    expect(res.statusCode).toBe(200);
    expect(setCookieFor(res, TRUST_COOKIE)).toBeDefined();
  });

  /** A signature counter that does not advance is the mark of a cloned authenticator. */
  test('refuses an assertion whose counter went backwards', async () => {
    const { challengeToken, options } = await passkeyChallenge();

    const res = await verifyAssertion(
      challengeToken,
      authenticator.authenticate(options, { counter: 1 })
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.data?.token).toBeUndefined();
  });

  test('refuses an assertion made for another origin', async () => {
    const { challengeToken, options } = await passkeyChallenge();

    const res = await verifyAssertion(
      challengeToken,
      authenticator.authenticate(options, { origin: 'https://evil.example' })
    );

    expect(res.statusCode).toBe(400);
  });

  test('refuses an assertion made for another relying party', async () => {
    const { challengeToken, options } = await passkeyChallenge();

    const res = await verifyAssertion(
      challengeToken,
      authenticator.authenticate(options, { rpId: 'evil.example' })
    );

    expect(res.statusCode).toBe(400);
  });
});
