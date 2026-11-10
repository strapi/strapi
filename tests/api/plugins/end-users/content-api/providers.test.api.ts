/**
 * Sign-in providers, over the whole stack: configured in the admin (or in `config/plugins.ts`),
 * then used to sign in against a fake OpenID Connect issuer. OAuth is the one thing that needs a
 * server of its own, which is why this is a file of its own: the issuer starts before each
 * instance and `strapi.destroy()` stops it (`createEndUsersInstance({ fakeOidc })`).
 *
 * What the service does with a body, a secret or a failed reload is in the unit tests
 * (`provider.vitest.test.ts`); here is what only shows against Better Auth and a real issuer.
 */
import path from 'node:path';
import { createAuthRequest, createRequest } from 'api-tests/request';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import { extendProfile } from '../utils/extend-profile';
import { startFakeOidc } from '../utils/fake-oidc';
import type { FakeOidc } from '../utils/fake-oidc';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  TEST_PASSWORD as PASSWORD,
  emptyTables,
  resetRoles,
} from '../utils/permissions';

const PROVIDERS = '/end-users/providers';
const FROM_FRONT_END = { Origin: TEST_ORIGIN };
const CLIENT_SECRET = 'fake-client-secret-value';

/** The fixture package, named by its path: nothing is installed in the test app. */
const FIXTURE_PACKAGE = path.join(__dirname, '..', 'fixtures', 'provider-package');

type Res = Awaited<ReturnType<ReturnType<typeof createRequest>['get']>>;

/** The cookies of a response, as a client sends them back */
const cookiesOf = (res: Res) =>
  ((res.headers['set-cookie'] ?? []) as unknown as string[])
    .map((cookie) => cookie.split(';')[0])
    .join('; ');

const jar = (...parts: string[]) => parts.filter(Boolean).join('; ');

describe('end-users: sign-in providers', () => {
  describe('configured in the admin', () => {
    let strapi;
    let oidc: FakeOidc;
    let rq;
    let rqAdmin;

    /**
     * What a browser does to sign in or link through a provider: ask the engine where to go
     * (`start`), let the issuer approve and send it back, then answer the issuer's redirect.
     * Answers the response of the engine's callback.
     */
    const throughIssuer = async (start: Res, cookie = '') => {
      expect(start.status).toBe(200);

      const authorize = await fetch(start.body.url, { redirect: 'manual' });
      const back = new URL(authorize.headers.get('location') as string);

      return rq.get(`${back.pathname}${back.search}`, {
        headers: { cookie: jar(cookie, cookiesOf(start)) },
      });
    };

    const signInThrough = (provider: string) =>
      rq
        .post('/api/auth/sign-in/social', {
          body: { provider, callbackURL: `${TEST_ORIGIN}/done`, disableRedirect: true },
          headers: FROM_FRONT_END,
        })
        .then((start: Res) => throughIssuer(start));

    const count = (uid: string, where: Record<string, unknown> = {}) =>
      strapi.db.query(uid).count({ where });

    beforeAll(async () => {
      oidc = await startFakeOidc();
      strapi = await createEndUsersInstance({
        fakeOidc: oidc,
        pluginConfig: { trustedOrigins: [TEST_ORIGIN], providers: [FIXTURE_PACKAGE] },
      });
      rq = createRequest({ strapi });
      rqAdmin = await createAuthRequest({ strapi });

      await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
      await resetRoles(strapi);
    });

    afterAll(async () => {
      // The providers made in the admin are kept in the database, which the next suite of the run
      // shares: take this one away so that it can make its own
      await rqAdmin.delete(`${PROVIDERS}/fake-idp`);
      await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
      await strapi.destroy();
    });

    it('creates an OIDC provider, and a user signs in through it', async () => {
      const created = await rqAdmin.post(PROVIDERS, {
        body: {
          id: 'fake-idp',
          name: 'Fake IdP',
          discoveryUrl: oidc.discoveryUrl,
          clientId: 'fake-client',
          clientSecret: CLIENT_SECRET,
        },
      });

      expect(created.status).toBe(200);
      expect(created.body.data).toMatchObject({
        id: 'fake-idp',
        kind: 'oidc',
        status: 'ready',
        clientSecretSet: true,
        redirectUri: expect.stringMatching(/\/api\/auth\/callback\/fake-idp$/),
      });
      // The secret is never in an answer
      expect(JSON.stringify(created.body)).not.toContain(CLIENT_SECRET);
      expect(JSON.stringify((await rqAdmin.get(PROVIDERS)).body)).not.toContain(CLIENT_SECRET);

      oidc.user = {
        sub: 'fake-subject-1',
        email: 'oidc-user@example.com',
        name: 'OIDC User',
        email_verified: true,
      };

      const callback = await signInThrough('fake-idp');

      expect(callback.status).toBe(302);
      expect(callback.headers.location).toContain(TEST_ORIGIN);
      expect(cookiesOf(callback)).toContain('strapi.session_token=');

      const user = await strapi
        .documents('plugin::end-users.user')
        .findFirst({ filters: { email: 'oidc-user@example.com' } });

      expect(user).toMatchObject({ email: 'oidc-user@example.com', name: 'OIDC User' });
      expect(
        await count('plugin::end-users.account', {
          providerId: 'fake-idp',
          accountId: 'fake-subject-1',
        })
      ).toBe(1);

      // The code was redeemed with a PKCE verifier that matches the challenge, and with the
      // secret as it was typed (the stored one is encrypted)
      expect(oidc.authorizeCalls[0]).toMatchObject({ code_challenge_method: 'S256' });
      expect(oidc.tokenCalls).toHaveLength(1);
      expect(oidc.tokenCalls[0]).toMatchObject({
        pkceValid: true,
        clientId: 'fake-client',
        clientSecret: CLIENT_SECRET,
      });
    });

    it('links the provider to a signed-in user, and unlinks it, but never the last account', async () => {
      const email = 'linker@example.com';
      const up = await rq.post('/api/auth/sign-up/email', {
        body: { email, password: PASSWORD, name: 'Linker' },
        headers: FROM_FRONT_END,
      });

      expect(up.status).toBe(200);

      const session = cookiesOf(up);

      oidc.user = { sub: 'fake-subject-2', email, name: 'Linker', email_verified: true };

      const start = await rq.post('/api/auth/link-social', {
        body: { provider: 'fake-idp', callbackURL: `${TEST_ORIGIN}/done`, disableRedirect: true },
        headers: { ...FROM_FRONT_END, cookie: session },
      });
      const linked = await throughIssuer(start, session);

      expect(linked.status).toBe(302);

      const accounts = await rq.get('/api/auth/list-accounts', { headers: { cookie: session } });

      expect(accounts.status).toBe(200);
      expect(accounts.body.map((account) => account.providerId).sort()).toEqual([
        'credential',
        'fake-idp',
      ]);

      // Better Auth unlinks by the id of the account row (the document id), not by provider
      const unlink = (providerId: string) =>
        rq.post('/api/auth/unlink-account', {
          body: {
            accountId: accounts.body.find((account) => account.providerId === providerId).id,
          },
          headers: { ...FROM_FRONT_END, cookie: session },
        });

      expect((await unlink('fake-idp')).status).toBe(200);

      const last = await unlink('credential');

      expect(last.status).toBe(400);

      const after = await rq.get('/api/auth/list-accounts', { headers: { cookie: session } });

      expect(after.body.map((account) => account.providerId)).toEqual(['credential']);
    });

    it('configures a provider package by name through the admin, and signs in through it', async () => {
      const listed = (await rqAdmin.get(PROVIDERS)).body.data;

      expect(listed.find((provider) => provider.id === 'fixture-idp')).toMatchObject({
        source: 'admin',
        kind: 'oidc',
        status: 'disabled',
      });

      // The issuer field is required, and the answer says which
      const missing = await rqAdmin.put(`${PROVIDERS}/fixture-idp`, {
        body: { clientId: 'fixture-client', clientSecret: CLIENT_SECRET },
      });

      expect(missing.status).toBe(400);
      expect(JSON.stringify(missing.body)).toContain('issuer');
      expect(JSON.stringify(missing.body)).not.toContain(CLIENT_SECRET);

      const saved = await rqAdmin.put(`${PROVIDERS}/fixture-idp`, {
        body: {
          clientId: 'fixture-client',
          clientSecret: CLIENT_SECRET,
          fields: { issuer: oidc.issuer },
        },
      });

      expect(saved.status).toBe(200);
      expect(saved.body.data).toMatchObject({ status: 'ready', fields: { issuer: oidc.issuer } });

      oidc.user = {
        sub: 'fake-subject-3',
        email: 'fixture-user@example.com',
        name: 'Fixture User',
        email_verified: true,
      };

      const callback = await signInThrough('fixture-idp');

      expect(callback.status).toBe(302);
      expect(
        await count('plugin::end-users.account', {
          providerId: 'fixture-idp',
          accountId: 'fake-subject-3',
        })
      ).toBe(1);
    });
  });

  describe('configured in config/plugins.ts', () => {
    let strapi;
    let oidc: FakeOidc;
    let rqAdmin;

    beforeAll(async () => {
      oidc = await startFakeOidc();
      strapi = await createEndUsersInstance({
        fakeOidc: oidc,
        pluginConfig: {
          trustedOrigins: [TEST_ORIGIN],
          providers: [
            {
              provider: FIXTURE_PACKAGE,
              options: {
                clientId: 'config-client',
                clientSecret: CLIENT_SECRET,
                issuer: oidc.issuer,
              },
            },
          ],
        },
      });
      rqAdmin = await createAuthRequest({ strapi });
    });

    afterAll(async () => {
      await strapi.destroy();
    });

    it('lists the provider as source config, and refuses to update or delete it', async () => {
      const listed = await rqAdmin.get(PROVIDERS);

      expect(listed.body.data.find((provider) => provider.id === 'fixture-idp')).toMatchObject({
        source: 'config',
        enabled: true,
        status: 'ready',
      });
      expect(JSON.stringify(listed.body)).not.toContain(CLIENT_SECRET);

      const update = await rqAdmin.put(`${PROVIDERS}/fixture-idp`, {
        body: { clientId: 'other' },
      });
      const remove = await rqAdmin.delete(`${PROVIDERS}/fixture-idp`);

      for (const res of [update, remove]) {
        expect(res.status).toBe(400);
        expect(res.body.error.message).toContain('config/plugins.ts');
      }
    });
  });

  describe('who a provider may sign in as', () => {
    let strapi;
    let oidc: FakeOidc;
    let rq;
    let rqAdmin;

    const signInThrough = async (provider: string) => {
      const start = await rq.post('/api/auth/sign-in/social', {
        body: { provider, callbackURL: `${TEST_ORIGIN}/done`, disableRedirect: true },
        headers: FROM_FRONT_END,
      });

      expect(start.status).toBe(200);

      const authorize = await fetch(start.body.url, { redirect: 'manual' });
      const back = new URL(authorize.headers.get('location') as string);

      return rq.get(`${back.pathname}${back.search}`, {
        headers: { cookie: cookiesOf(start) },
      });
    };

    const count = (uid: string, where: Record<string, unknown> = {}) =>
      strapi.db.query(uid).count({ where });

    const userByEmail = (email: string) =>
      strapi.documents('plugin::end-users.user').findFirst({ filters: { email } });

    /** A user with a password who has confirmed their address, the one a provider could be taken for */
    const existingUser = async (email: string, overrides: Record<string, unknown> = {}) => {
      const user = await strapi.documents('plugin::end-users.user').create({
        data: { email, name: 'Existing', emailVerified: true, ...overrides },
      });

      await strapi.documents('plugin::end-users.account').create({
        data: {
          userId: user.documentId,
          providerId: 'credential',
          accountId: user.documentId,
          password: await strapi.plugin('end-users').service('engine').get().hashPassword(PASSWORD),
        },
      });

      return user;
    };

    const setTrust = (trustForLinking: boolean) =>
      rqAdmin.put(`${PROVIDERS}/fake-idp`, { body: { trustForLinking } });

    /** The redirect of a refused callback names the error, and no session cookie came with it */
    const expectRefused = (callback: Res, error = 'account_not_linked') => {
      expect(callback.status).toBe(302);
      expect(new URL(callback.headers.location).searchParams.get('error')).toBe(error);
      expect(cookiesOf(callback)).not.toMatch(/strapi\.session_token=[^;]/);
    };

    beforeAll(async () => {
      oidc = await startFakeOidc();
      strapi = await createEndUsersInstance({
        fakeOidc: oidc,
        pluginConfig: { trustedOrigins: [TEST_ORIGIN] },
      });
      rq = createRequest({ strapi });
      rqAdmin = await createAuthRequest({ strapi });

      await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
      await resetRoles(strapi);

      const created = await rqAdmin.post(PROVIDERS, {
        body: {
          id: 'fake-idp',
          name: 'Fake IdP',
          discoveryUrl: oidc.discoveryUrl,
          clientId: 'fake-client',
          clientSecret: CLIENT_SECRET,
        },
      });

      expect(created.status).toBe(200);
    });

    afterAll(async () => {
      await rqAdmin.delete(`${PROVIDERS}/fake-idp`);
      await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
      await strapi.destroy();
    });

    it('does not link a provider that says the address is unverified to an existing account', async () => {
      const email = 'victim@example.com';
      const victim = await existingUser(email);

      await setTrust(false);
      oidc.user = {
        sub: 'attacker-subject-1',
        email,
        name: 'Attacker',
        email_verified: false,
      };

      const callback = await signInThrough('fake-idp');

      expectRefused(callback);
      expect(await count('plugin::end-users.session', { userId: victim.documentId })).toBe(0);
      // Nothing about the victim moved: one account, still the password, no row for the provider
      expect(await count('plugin::end-users.account', { userId: victim.documentId })).toBe(1);
      expect(
        await count('plugin::end-users.account', {
          providerId: 'fake-idp',
          accountId: 'attacker-subject-1',
        })
      ).toBe(0);
      expect(await count('plugin::end-users.user', { email })).toBe(1);
    });

    it('links an unverified provider address to an existing verified account only when the provider is trusted', async () => {
      const email = 'trusted-link@example.com';
      const existing = await existingUser(email);

      oidc.user = { sub: 'trusted-subject-1', email, name: 'Trusted', email_verified: false };

      expect((await setTrust(true)).status).toBe(200);

      const callback = await signInThrough('fake-idp');

      expect(callback.status).toBe(302);
      expect(cookiesOf(callback)).toContain('strapi.session_token=');
      expect(await count('plugin::end-users.user', { email })).toBe(1);
      expect(
        await count('plugin::end-users.account', {
          userId: existing.documentId,
          providerId: 'fake-idp',
          accountId: 'trusted-subject-1',
        })
      ).toBe(1);

      // Trust does not reach an account whose own address was never confirmed
      const unconfirmed = await existingUser('unconfirmed@example.com', { emailVerified: false });

      oidc.user = {
        sub: 'trusted-subject-2',
        email: 'unconfirmed@example.com',
        name: 'Trusted',
        email_verified: true,
      };

      expectRefused(await signInThrough('fake-idp'));
      expect(await count('plugin::end-users.account', { userId: unconfirmed.documentId })).toBe(1);
    });

    it('links a verified provider address to an existing verified account without the trust flag', async () => {
      const email = 'verified-link@example.com';
      const existing = await existingUser(email);

      await setTrust(false);
      oidc.user = { sub: 'verified-subject-1', email, name: 'Verified', email_verified: true };

      const callback = await signInThrough('fake-idp');

      expect(callback.status).toBe(302);
      expect(cookiesOf(callback)).toContain('strapi.session_token=');
      expect(
        await count('plugin::end-users.account', {
          userId: existing.documentId,
          providerId: 'fake-idp',
        })
      ).toBe(1);
    });

    it('treats a provider that never sends email_verified as unverified: a new user is made unverified, an existing address is refused', async () => {
      await setTrust(false);

      const fresh = { sub: 'silent-subject-1', email: 'silent-new@example.com', name: 'Silent' };

      oidc.user = fresh as never;

      const created = await signInThrough('fake-idp');

      expect(created.status).toBe(302);
      expect(cookiesOf(created)).toContain('strapi.session_token=');
      expect(await userByEmail('silent-new@example.com')).toMatchObject({ emailVerified: false });

      const email = 'silent-existing@example.com';
      const existing = await existingUser(email);

      oidc.user = { sub: 'silent-subject-2', email, name: 'Silent' } as never;

      expectRefused(await signInThrough('fake-idp'));
      expect(await count('plugin::end-users.session', { userId: existing.documentId })).toBe(0);
      expect(await count('plugin::end-users.account', { userId: existing.documentId })).toBe(1);
    });

    it('creates no session for a banned user, whether the provider is already linked or links by a verified address', async () => {
      await setTrust(false);

      // Already linked: sign in once, then ban
      oidc.user = {
        sub: 'banned-subject-1',
        email: 'banned-linked@example.com',
        name: 'Banned',
        email_verified: true,
      };
      expect((await signInThrough('fake-idp')).status).toBe(302);

      const linked = await userByEmail('banned-linked@example.com');

      await strapi
        .documents('plugin::end-users.user')
        .update({ documentId: linked.documentId, data: { banned: true, banReason: 'spam' } });

      expectRefused(await signInThrough('fake-idp'), 'BANNED_USER');
      expect(await count('plugin::end-users.session', { userId: linked.documentId })).toBe(0);

      // Not linked yet: the address is verified, so it would link, but the user is banned
      const email = 'banned-implicit@example.com';
      const banned = await existingUser(email, { banned: true, banReason: 'spam' });

      oidc.user = { sub: 'banned-subject-2', email, name: 'Banned', email_verified: true };

      expectRefused(await signInThrough('fake-idp'), 'BANNED_USER');
      expect(await count('plugin::end-users.session', { userId: banned.documentId })).toBe(0);
    });
  });

  describe('what a provider writes on sign-in', () => {
    // The profile has a `department` field, the way a project adds one in the Content-Type Builder
    const restoreApp = extendProfile({ department: { type: 'string', maxLength: 20 } });
    let strapi;
    let oidc: FakeOidc;
    let rq;
    let rqAdmin;

    const signInThrough = async (provider: string) => {
      const start = await rq.post('/api/auth/sign-in/social', {
        body: { provider, callbackURL: `${TEST_ORIGIN}/done`, disableRedirect: true },
        headers: FROM_FRONT_END,
      });

      expect(start.status).toBe(200);

      const authorize = await fetch(start.body.url, { redirect: 'manual' });
      const back = new URL(authorize.headers.get('location') as string);

      return rq.get(`${back.pathname}${back.search}`, {
        headers: { cookie: cookiesOf(start) },
      });
    };

    const count = (uid: string, where: Record<string, unknown> = {}) =>
      strapi.db.query(uid).count({ where });

    const profileOf = (email: string) =>
      strapi.documents(PROFILE_UID).findFirst({ filters: { user: { email } } });

    const save = (body: Record<string, unknown>) => rqAdmin.put(`${PROVIDERS}/fake-idp`, { body });

    beforeAll(async () => {
      oidc = await startFakeOidc();
      strapi = await createEndUsersInstance({
        fakeOidc: oidc,
        pluginConfig: { trustedOrigins: [TEST_ORIGIN] },
      });
      rq = createRequest({ strapi });
      rqAdmin = await createAuthRequest({ strapi });

      await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
      await resetRoles(strapi);

      const created = await rqAdmin.post(PROVIDERS, {
        body: {
          id: 'fake-idp',
          name: 'Fake IdP',
          discoveryUrl: oidc.discoveryUrl,
          clientId: 'fake-client',
          clientSecret: CLIENT_SECRET,
          updateUserOnSignIn: true,
          profileMapping: [{ attribute: 'department', claim: 'department', when: 'sign-up' }],
        },
      });

      expect(created.status).toBe(200);
      expect(created.body.data).toMatchObject({
        updateUserOnSignIn: true,
        profileMapping: [{ attribute: 'department', claim: 'department', when: 'sign-up' }],
      });
    });

    afterAll(async () => {
      // The providers made in the admin are kept in the database, which the next suite of the run
      // shares: take this one away so that it can make its own
      await rqAdmin.delete(`${PROVIDERS}/fake-idp`);
      await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
      await strapi.destroy();
      restoreApp();
    });

    it('writes a claim mapped on sign-up to the profile, and never moves the email afterwards', async () => {
      oidc.user = {
        sub: 'fake-subject-10',
        email: 'mapped@example.com',
        name: 'Mapped User',
        email_verified: true,
        department: 'Research',
      };

      expect((await signInThrough('fake-idp')).status).toBe(302);
      expect(await profileOf('mapped@example.com')).toMatchObject({ department: 'Research' });

      // The provider now sends another address, another name and another department
      oidc.user = {
        ...oidc.user,
        email: 'moved@example.com',
        name: 'Renamed User',
        department: 'Operations',
      };

      expect((await signInThrough('fake-idp')).status).toBe(302);

      const user = await strapi
        .documents('plugin::end-users.user')
        .findFirst({ filters: { email: 'mapped@example.com' } });

      // The name follows (the toggle is on), the email does not, and a sign-up mapping runs once
      expect(user).toMatchObject({ email: 'mapped@example.com', name: 'Renamed User' });
      expect(await count('plugin::end-users.user', { email: 'moved@example.com' })).toBe(0);
      expect(await profileOf('mapped@example.com')).toMatchObject({ department: 'Research' });
    });

    it('writes an every-sign-in mapping at each sign-in', async () => {
      const saved = await save({
        profileMapping: [{ attribute: 'department', claim: 'department', when: 'every-sign-in' }],
      });

      expect(saved.status).toBe(200);

      oidc.user = { ...oidc.user, department: 'Support' };

      expect((await signInThrough('fake-idp')).status).toBe(302);
      expect(await profileOf('mapped@example.com')).toMatchObject({ department: 'Support' });
    });

    it('refuses a mapping to the user relation or to a field that does not exist, naming the row', async () => {
      for (const attribute of ['user', 'nothing']) {
        const refused = await save({
          profileMapping: [{ attribute, claim: 'department', when: 'sign-up' }],
        });

        expect(refused.status).toBe(400);
        expect(JSON.stringify(refused.body)).toContain('profileMapping[0]');
      }
    });

    it('skips a claim the profile refuses, and the user signs in', async () => {
      oidc.user = { ...oidc.user, department: 'A department name that is far too long' };

      const callback = await signInThrough('fake-idp');

      expect(callback.status).toBe(302);
      expect(cookiesOf(callback)).toContain('strapi.session_token=');
      expect(await profileOf('mapped@example.com')).toMatchObject({ department: 'Support' });
    });
  });
});
