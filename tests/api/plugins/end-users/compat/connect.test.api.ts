/**
 * The Users & Permissions OAuth routes, `GET /api/connect/:provider`, `GET
 * /api/connect/:provider/callback` and the `GET /api/auth/:provider/callback` exchange, over the
 * whole stack and against a fake OpenID Connect issuer. The first instance has the compatibility
 * mode on, the second has it off: one instance at a time per file.
 */
import path from 'node:path';
import { createAuthRequest, createRequest } from 'api-tests/request';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import { compatConfig, seedUpUser } from '../utils/compat';
import { startFakeOidc } from '../utils/fake-oidc';
import type { FakeOidc } from '../utils/fake-oidc';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  bearer,
  emptyTables,
  resetRoles,
} from '../utils/permissions';

const FIXTURE_PACKAGE = path.join(__dirname, '..', 'fixtures', 'provider-package');
const PROVIDER = 'fixture-idp';
const CONNECT = `/api/connect/${PROVIDER}`;
const FRONT_END = `${TEST_ORIGIN}/connect/done`;
const CLIENT_SECRET = 'fake-client-secret-value';
const USER_UID = 'plugin::end-users.user';
const ACCOUNT_UID = 'plugin::end-users.account';
const SESSION_UID = 'plugin::end-users.session';

type Res = Awaited<ReturnType<ReturnType<typeof createRequest>['get']>>;

/** The cookies of a response, as a client sends them back */
const cookiesOf = (res: Res) =>
  ((res.headers['set-cookie'] ?? []) as unknown as string[])
    .map((cookie) => cookie.split(';')[0])
    .join('; ');

describe('end-users compat: connect and the callback exchange', () => {
  let strapi;
  let oidc: FakeOidc;
  let rq;
  let rqAdmin;

  const reset = async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await resetRoles(strapi);
    oidc.reset();
    oidc.user = {
      sub: 'fake-subject-1',
      email: 'oidc-user@example.com',
      name: 'OIDC User',
      email_verified: true,
    };
  };

  /** What a browser does after the start: follow the provider's redirect back to the callback. */
  const back = async (start: Res) => {
    const authorize = await fetch(start.headers.location as string, { redirect: 'manual' });
    const returned = new URL(authorize.headers.get('location') as string);

    return rq.get(`${returned.pathname}${returned.search}`, {
      headers: { cookie: cookiesOf(start) },
    });
  };

  /** The whole flow, to the response of the connect callback. */
  const connect = async (query = '') => back(await rq.get(`${CONNECT}${query}`));

  beforeAll(async () => {
    oidc = await startFakeOidc();
    strapi = await createEndUsersInstance({
      fakeOidc: oidc,
      pluginConfig: {
        ...compatConfig({ connect: { callbacks: { [PROVIDER]: FRONT_END } } }),
        trustedOrigins: [TEST_ORIGIN],
        providers: [
          {
            provider: FIXTURE_PACKAGE,
            options: { clientId: 'fake-client', clientSecret: CLIENT_SECRET, issuer: oidc.issuer },
          },
          // A second provider the user has no account with
          {
            provider: 'github',
            options: { clientId: 'other-client', clientSecret: CLIENT_SECRET },
          },
        ],
      },
    });
    rq = createRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });
  });

  beforeEach(reset);

  afterAll(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await strapi.destroy();
  });

  it('starts the flow at /connect/:provider and sends the browser to the provider', async () => {
    const start = await rq.get(CONNECT);

    expect(start.status).toBe(302);
    expect(start.headers.location).toMatch(new RegExp(`^${oidc.issuer}/authorize\\?`));

    const authorize = new URL(start.headers.location as string);

    expect(authorize.searchParams.get('redirect_uri')).toMatch(new RegExp(`${CONNECT}/callback$`));
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
    expect(cookiesOf(start)).toContain('.state=');
  });

  it('the provider returns to /connect/:provider/callback and the browser lands on the front-end URL with no token in it', async () => {
    const callback = await connect();

    expect(callback.status).toBe(302);
    // The configured address, exactly: no token, no query
    expect(callback.headers.location).toBe(FRONT_END);
    expect(cookiesOf(callback)).toContain('.session_token=');
    // The provider was given the same address for the token request
    expect(oidc.tokenCalls[0]).toMatchObject({
      pkceValid: true,
      redirectUri: expect.stringMatching(new RegExp(`${CONNECT}/callback$`)),
    });

    // A ?callback= of a trusted origin wins; one that is not trusted is refused
    const asked = await rq.get(`${CONNECT}?callback=${encodeURIComponent(`${TEST_ORIGIN}/asked`)}`);

    expect((await back(asked)).headers.location).toBe(`${TEST_ORIGIN}/asked`);

    const refused = await rq.get(
      `${CONNECT}?callback=${encodeURIComponent('https://evil.example.net/asked')}`
    );

    expect(refused.status).toBe(400);
    expect(refused.body.error.message).toBe('Provider callback URL is not configured');
  });

  it('GET /auth/:provider/callback with that session returns { jwt, user }, and a session-less call is refused', async () => {
    const callback = await connect();
    const exchange = await rq.get(`/api/auth/${PROVIDER}/callback`, {
      headers: { cookie: cookiesOf(callback) },
    });

    expect(exchange.status).toBe(200);
    expect(exchange.body).toMatchObject({
      jwt: expect.any(String),
      user: { email: 'oidc-user@example.com' },
    });

    // The jwt is the session token: it works as a Bearer token
    const me = await rq.get('/api/users/me', { headers: bearer(exchange.body.jwt) });

    expect(me.status).toBe(200);
    expect(me.body.email).toBe('oidc-user@example.com');

    const without = await rq.get(`/api/auth/${PROVIDER}/callback`);

    expect(without.status).toBe(400);
    expect(without.body.error.message).toBe(
      'OAuth authentication requires a completed provider session'
    );
  });

  it('refuses the exchange a second time for the same session', async () => {
    const callback = await connect();
    const headers = { cookie: cookiesOf(callback) };

    expect((await rq.get(`/api/auth/${PROVIDER}/callback`, { headers })).status).toBe(200);

    const again = await rq.get(`/api/auth/${PROVIDER}/callback`, { headers });

    expect(again.status).toBe(400);
    expect(again.body.error.message).toBe(
      'OAuth authentication requires a completed provider session'
    );
  });

  it('refuses the exchange for a session older than five minutes', async () => {
    const callback = await connect();

    await strapi.db.query(SESSION_UID).updateMany({
      where: {},
      data: { createdAt: new Date(Date.now() - 10 * 60 * 1000) },
    });

    const exchange = await rq.get(`/api/auth/${PROVIDER}/callback`, {
      headers: { cookie: cookiesOf(callback) },
    });

    expect(exchange.status).toBe(400);
    expect(exchange.body.error.message).toBe(
      'OAuth authentication requires a completed provider session'
    );
  });

  it("refuses the exchange under another provider's name", async () => {
    const callback = await connect();
    const exchange = await rq.get('/api/auth/github/callback', {
      headers: { cookie: cookiesOf(callback) },
    });

    expect(exchange.status).toBe(400);
    expect(exchange.body.error.message).toBe(
      'OAuth authentication requires a completed provider session'
    );

    // The refusal spent nothing: the session still exchanges under the provider that made it
    expect(
      (
        await rq.get(`/api/auth/${PROVIDER}/callback`, {
          headers: { cookie: cookiesOf(callback) },
        })
      ).status
    ).toBe(200);
  });

  it('ignores ?access_token=', async () => {
    const callback = await connect();
    const named = await rq.get(`/api/auth/${PROVIDER}/callback?access_token=anything`);

    expect(named.status).toBe(400);

    const exchange = await rq.get(`/api/auth/${PROVIDER}/callback?access_token=anything`, {
      headers: { cookie: cookiesOf(callback) },
    });

    expect(exchange.status).toBe(200);
    expect(exchange.body.user.email).toBe('oidc-user@example.com');
  });

  it('sends a provider failure to the front-end URL as ?error=oauth_error', async () => {
    const start = await rq.get(CONNECT);
    const state = new URL(start.headers.location as string).searchParams.get('state');
    const failed = await rq.get(`${CONNECT}/callback?error=access_denied&state=${state}`, {
      headers: { cookie: cookiesOf(start) },
    });

    expect(failed.status).toBe(302);

    const target = new URL(failed.headers.location as string);

    expect(`${target.origin}${target.pathname}`).toBe(FRONT_END);
    expect(target.searchParams.get('error')).toBe('oauth_error');
    expect(target.searchParams.get('error_description')).toBe('access_denied');
  });

  it('sends a callback with a different state to the front-end URL, with no session', async () => {
    const start = await rq.get(CONNECT);
    const authorize = await fetch(start.headers.location as string, { redirect: 'manual' });
    const returned = new URL(authorize.headers.get('location') as string);

    returned.searchParams.set('state', 'not-the-state');

    const failed = await rq.get(`${returned.pathname}${returned.search}`, {
      headers: { cookie: cookiesOf(start) },
    });

    expect(failed.status).toBe(302);
    expect(new URL(failed.headers.location as string).searchParams.get('error')).toBe(
      'oauth_error'
    );
    expect(cookiesOf(failed)).not.toContain('.session_token=');
  });

  it('the admin shows /api/connect/<id>/callback as the redirect URI', async () => {
    const listed = await rqAdmin.get('/end-users/providers');
    const provider = listed.body.data.find(({ id }) => id === PROVIDER);

    expect(provider.redirectUri).toMatch(new RegExp(`${CONNECT}/callback$`));
  });

  it('links a second sign-in to the same user by verified email', async () => {
    const seeded = await seedUpUser(strapi, { email: 'oidc-user@example.com' });

    expect((await connect()).status).toBe(302);

    oidc.user = { ...oidc.user, sub: 'fake-subject-2' };

    expect((await connect()).status).toBe(302);

    expect(await strapi.db.query(USER_UID).count({ where: { email: seeded.email } })).toBe(1);
    expect(
      await strapi.db.query(ACCOUNT_UID).count({
        where: { providerId: PROVIDER, userId: seeded.documentId },
      })
    ).toBeGreaterThanOrEqual(1);
  });
});

describe('end-users compat: connect with compat off', () => {
  it('answers 404 for /api/connect with compat off', async () => {
    // The plugin's route table is built once per module load, and the first instance built it with
    // compat on: the plugin is loaded again for this one
    jest.resetModules();

    const strapi = await createEndUsersInstance({
      pluginConfig: { trustedOrigins: [TEST_ORIGIN] },
    });

    try {
      const rq = createRequest({ strapi });

      expect((await rq.get(CONNECT)).status).toBe(404);
      expect((await rq.get(`${CONNECT}/callback`)).status).toBe(404);
    } finally {
      await strapi.destroy();
    }
  });
});
