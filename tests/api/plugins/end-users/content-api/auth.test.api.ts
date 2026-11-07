/**
 * The HTTP contract of the plugin's own endpoints: Better Auth's native endpoints under
 * `/api/auth`, `GET /api/users/me`, `/api/users/me/profile`, `/api/end-users/permissions/me`, and
 * what a user managed outside HTTP (the Content Manager, the Document Service) gets from the engine.
 *
 * What the plugin's logic does is in the unit tests (`*.vitest.test.ts` beside the code). This file
 * keeps one case for each thing that only shows against the whole stack: the real Better Auth engine,
 * the database and the Koa middleware chain. The Content API strategy and the permission rules on
 * content are in `permissions.test.api.ts`.
 */
import request from 'supertest';
import { createAuthRequest, createContentAPIRequest, createRequest } from 'api-tests/request';
import { createEndUsersInstance } from '../utils/create-end-users-instance';
import { clearSentEmails, sentEmails } from '../utils/email-capture-provider';
import { extendProfile } from '../utils/extend-profile';
import { totpFromUri } from '../utils/totp';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  TEST_PASSWORD as PASSWORD,
  bearer,
  emptyTables,
  resetRoles,
  setRolePermissions,
} from '../utils/permissions';
import { DEFAULT_AUTHENTICATED_PERMISSIONS } from '../../../../../packages/plugins/end-users/server/src/bootstrap';

const USER_UID = 'plugin::end-users.user';
const ROLE_UID = 'plugin::end-users.role';
const SESSION_UID = 'plugin::end-users.session';
const ACCOUNT_UID = 'plugin::end-users.account';
const VERIFICATION_UID = 'plugin::end-users.verification';
const TWO_FACTOR_UID = 'plugin::end-users.two-factor';
const TOKEN_NAME = 'end-users-auth-test';
const UNTRUSTED = 'https://evil.example.com';

/**
 * What a browser sends with a state-changing request from the front end. Better Auth refuses one
 * that carries the session cookie unless its origin is trusted, and it enforces that under
 * NODE_ENV=test too, so these tests send it like the real client does.
 */
const FROM_FRONT_END = { Origin: TEST_ORIGIN };

type Res = Awaited<ReturnType<ReturnType<typeof createRequest>['get']>>;

/** `name=value` of the cookie with this name, as a client sends it back. */
const cookieOf = (res: Res, name: string) => {
  const cookies = (res.headers['set-cookie'] ?? []) as unknown as string[];
  const found = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return found?.split(';')[0] as string;
};

describe('end-users: the plugin endpoints, over the whole stack', () => {
  // The test app's profile has two project fields, `company` and `newsletter`, the way a project
  // adds them in the Content-Type Builder
  const restoreApp = extendProfile({
    company: { type: 'string', maxLength: 20 },
    newsletter: { type: 'boolean', default: false },
  });
  let strapi;
  let rq;
  let settings;
  let emails = 0;

  const setRegistrationFields = (registrationFields: string[]) =>
    settings.set({ signUp: { registrationFields } });

  const count = (uid: string, where: Record<string, unknown> = {}) =>
    strapi.db.query(uid).count({ where });

  const signUp = (email: string, extra: Record<string, unknown> = {}) =>
    rq.post('/api/auth/sign-up/email', {
      body: { email, password: PASSWORD, name: 'Test', ...extra },
      headers: FROM_FRONT_END,
    });

  const signIn = (email: string, password = PASSWORD, headers: Record<string, string> = {}) =>
    rq.post('/api/auth/sign-in/email', { body: { email, password }, headers });

  /** A user who signed up, and what they would send to be recognised */
  const signedUp = async (extra: Record<string, unknown> = {}) => {
    emails += 1;

    const email = `auth-${emails}@example.com`;
    const res = await signUp(email, extra);

    expect(res.statusCode).toBe(200);

    return {
      documentId: res.body.user.id as string,
      email,
      token: res.headers['set-auth-token'] as string,
      cookie: cookieOf(res, 'strapi.session_token'),
    };
  };

  const profileOf = (userDocumentId: string) =>
    strapi.documents(PROFILE_UID).findMany({ filters: { user: { documentId: userDocumentId } } });

  const rolesOf = async (userDocumentId: string) =>
    (await strapi.documents(USER_UID).findOne({ documentId: userDocumentId, populate: ['roles'] }))
      .roles;

  beforeAll(async () => {
    // The front end of these tests is a trusted origin, as one is in a real project, on another site
    // than the server (cross-site cookies), behind a strict CORS configuration, with the rate limit
    // kept in the database as it is in production
    strapi = await createEndUsersInstance({
      pluginConfig: {
        cookies: { crossSite: true },
        trustedOrigins: [TEST_ORIGIN],
        rateLimit: { storage: 'database' },
      },
      async register({ strapi: instance }) {
        // What the strategy answers to, and what it leaves on the context
        instance.server.routes({
          type: 'content-api',
          routes: [
            {
              method: 'GET',
              path: '/end-users-test/strategy',
              handler(ctx) {
                ctx.body = { name: ctx.state.auth.strategy.name, role: ctx.state.user.role };
              },
              config: { auth: { strategies: ['end-users'] } },
            },
          ],
        });

        instance.config.set('middlewares', [
          'strapi::logger',
          'strapi::errors',
          'strapi::security',
          {
            name: 'strapi::cors',
            config: {
              origin: [TEST_ORIGIN],
              credentials: true,
              expose: ['x-request-id'],
              headers: ['Content-Type', 'Authorization'],
            },
          },
          'strapi::poweredBy',
          'strapi::query',
          'strapi::body',
          'strapi::session',
          'strapi::favicon',
          'strapi::public',
        ]);
      },
    });
    rq = createRequest({ strapi });
    settings = strapi.plugin('end-users').service('settings');

    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await resetRoles(strapi);
    await setRegistrationFields([]);
  });

  afterAll(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await setRegistrationFields([]);
    await strapi.db
      .query('admin::api-token')
      .deleteMany({ where: { name: { $startsWith: TOKEN_NAME } } });
    await strapi.destroy();
    restoreApp();
  });

  describe('the native Better Auth endpoints', () => {
    it('signs a user up and in as one Strapi document per email, however the email is spelled', async () => {
      const up = await signUp('Alice@Example.com ', { name: 'Alice' });

      expect(up.statusCode).toBe(200);
      expect(up.body.user.email).toBe('alice@example.com');
      expect(up.body.user.id).toMatch(/^[a-z0-9]{24,}$/); // a documentId, not a number

      const stored = await strapi
        .documents(USER_UID)
        .findFirst({ filters: { email: 'alice@example.com' } });

      expect(stored).toMatchObject({
        documentId: up.body.user.id,
        email: 'alice@example.com',
        name: 'Alice',
      });

      const inRes = await signIn('alice@example.com');

      expect(inRes.statusCode).toBe(200);
      expect(inRes.body.token).toEqual(expect.any(String));

      // A wrong password and an unknown email are answered the same way
      const wrongPassword = await signIn('alice@example.com', 'not-the-password');
      const unknown = await signIn('nobody@example.com');

      expect(wrongPassword.statusCode).toBe(401);
      expect(unknown.statusCode).toBe(401);
      expect(unknown.body).toEqual(wrongPassword.body);

      // A second sign-up in another spelling, and two at once, make no second user
      const again = await signUp(' ALICE@example.com');

      expect(again.statusCode).toBeGreaterThanOrEqual(400);

      await Promise.allSettled([signUp('race@example.com'), signUp('race@example.com')]);

      expect(await count(USER_UID, { email: 'alice@example.com' })).toBe(1);
      expect(await count(USER_UID, { email: 'race@example.com' })).toBe(1);
    });

    it('keeps a cookie session from sign-in to sign-out, and lists the sessions by documentId', async () => {
      const { email } = await signedUp();

      const inRes = await signIn(email);
      const cookie = cookieOf(inRes, 'strapi.session_token');

      expect(cookie).toBeDefined();
      expect(inRes.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);
      // The cookie cache is off by default: nothing answers for a session that was revoked
      expect(cookieOf(inRes, 'strapi.session_data')).toBeUndefined();

      const session = await rq.get('/api/auth/get-session', { headers: { cookie } });

      expect(session.statusCode).toBe(200);
      expect(session.body.user.email).toBe(email);
      expect(session.body.session.userId).toBe(session.body.user.id);

      const list = await rq.get('/api/auth/list-sessions', { headers: { cookie } });

      expect(list.statusCode).toBe(200);
      expect(list.body.length).toBeGreaterThanOrEqual(1);
      expect(list.body[0].userId).toMatch(/^[a-z0-9]{24,}$/);

      const out = await rq.post('/api/auth/sign-out', {
        body: {},
        headers: { cookie, ...FROM_FRONT_END },
      });

      expect(out.statusCode).toBe(200);

      const after = await rq.get('/api/auth/get-session', { headers: { cookie } });

      expect(after.statusCode).toBe(200);
      expect(after.body).toBeNull();
    });

    it('keeps a Bearer session from sign-in to sign-out', async () => {
      const { email } = await signedUp();

      const token = (await signIn(email)).headers['set-auth-token'];

      expect(token).toEqual(expect.any(String));

      const authorization = `Bearer ${token}`;
      const session = await rq.get('/api/auth/get-session', { headers: { authorization } });

      expect(session.statusCode).toBe(200);
      expect(session.body.user.email).toBe(email);
      expect(
        (await rq.post('/api/auth/sign-out', { body: {}, headers: { authorization } })).statusCode
      ).toBe(200);
      expect(
        (await rq.get('/api/auth/get-session', { headers: { authorization } })).body
      ).toBeNull();
    });

    it('redeems a password reset token once: a second or a simultaneous use fails, and an expired or unknown token is refused', async () => {
      const { email, documentId } = await signedUp();

      const seedToken = (token: string, expiresAt = new Date(Date.now() + 60 * 60 * 1000)) =>
        strapi.documents(VERIFICATION_UID).create({
          data: { identifier: `reset-password:${token}`, value: documentId, expiresAt },
        });
      const reset = (token: string, newPassword: string) =>
        rq.post('/api/auth/reset-password', { body: { token, newPassword } });

      await seedToken('token-used-twice');

      const first = await reset('token-used-twice', 'N3w-password-long');

      expect(first.statusCode).toBe(200);
      expect(first.body).toEqual({ status: true });

      const second = await reset('token-used-twice', 'Another-password-1');

      expect(second.statusCode).toBe(400);
      expect(second.body.code).toBe('INVALID_TOKEN');
      expect(await count(VERIFICATION_UID, { identifier: 'reset-password:token-used-twice' })).toBe(
        0
      );
      // The first password took, the second attempt changed nothing
      expect((await signIn(email, 'N3w-password-long')).statusCode).toBe(200);
      expect((await signIn(email, 'Another-password-1')).statusCode).toBe(401);
      expect((await signIn(email, PASSWORD)).statusCode).toBe(401);

      // Two at once: one of them wins
      await seedToken('token-used-at-once');

      const results = await Promise.all([
        reset('token-used-at-once', 'First-password-long-1'),
        reset('token-used-at-once', 'Second-password-long-2'),
      ]);

      expect(results.map(({ statusCode }) => statusCode).sort()).toEqual([200, 400]);

      // An expired token and one that never existed
      await seedToken('token-expired', new Date(Date.now() - 1000));

      expect((await reset('token-expired', 'N3w-password-long')).statusCode).toBe(400);
      expect((await reset('token-unknown', 'N3w-password-long')).statusCode).toBe(400);
    });

    it('asks for the second factor, counts failed codes and forgives them after a good one', async () => {
      const { email, documentId } = await signedUp();
      const cookie = cookieOf(await signIn(email), 'strapi.session_token');
      const enabled = await rq.post('/api/auth/two-factor/enable', {
        body: { password: PASSWORD },
        headers: { cookie, ...FROM_FRONT_END },
      });

      expect(enabled.statusCode).toBe(200);

      const verified = await rq.post('/api/auth/two-factor/verify-totp', {
        body: { code: totpFromUri(enabled.body.totpURI) },
        headers: { cookie, ...FROM_FRONT_END },
      });

      expect(verified.statusCode).toBe(200);

      // From now on a password is not enough: Better Auth answers with a challenge and no session
      const challenge = await signIn(email);

      expect(challenge.statusCode).toBe(200);
      expect(challenge.body).toEqual({
        twoFactorRedirect: true,
        // The code by email is offered besides the authenticator app: the plugin sends it through
        // the `two-factor-otp` template
        twoFactorMethods: ['totp', 'otp'],
      });
      // Bearer must not hand out the token of the session two-factor has just deleted
      expect(challenge.headers['set-auth-token']).toBeUndefined();
      expect(cookieOf(challenge, 'strapi.session_token')?.split('=')[1] ?? '').toBe('');

      const twoFactorCookie = cookieOf(challenge, 'strapi.two_factor');

      expect(twoFactorCookie).toBeDefined();

      const countOf = async () =>
        (await strapi.db.query(TWO_FACTOR_UID).findOne({ where: { userId: documentId } }))
          .failedVerificationCount;

      // Each wrong code is counted by the adapter's incrementOne, on the row, in the database
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const wrong = await rq.post('/api/auth/two-factor/verify-totp', {
          body: { code: '000000' },
          headers: { cookie: twoFactorCookie, ...FROM_FRONT_END },
        });

        expect(wrong.statusCode).toBe(401);
        expect(wrong.body.code).toBe('INVALID_CODE');
        // eslint-disable-next-line no-await-in-loop
        expect(await countOf()).toBe(attempt);
      }

      const right = await rq.post('/api/auth/two-factor/verify-totp', {
        body: { code: totpFromUri(enabled.body.totpURI) },
        headers: { cookie: twoFactorCookie, ...FROM_FRONT_END },
      });

      expect(right.statusCode).toBe(200);
      expect(right.body.user.email).toBe(email);
      expect(right.headers['set-auth-token']).toEqual(expect.any(String));
      expect(await countOf()).toBe(0);
    });

    it('answers 404 to the endpoints of the admin plugin however the path is spelled, and to plugins that are not installed, and serves the rest', async () => {
      const admin: Array<[string, string]> = [
        ['GET', '/api/auth/admin/list-users'],
        ['GET', '/api/auth/admin/list-users/'],
        ['GET', '/api/auth/admin/list-users?limit=1'],
        ['GET', '/api/auth/Admin/list-users'],
        ['GET', '/api/auth/./admin/list-users'],
        ['GET', '/api/auth/x/../admin/list-users'],
        ['GET', '/api/auth/x/%2e%2e/admin/list-users'],
        ['GET', '/api/auth/%61dmin/list-users'],
        ['GET', '/api/auth//admin/list-users'],
        ['POST', '/api/auth/admin/create-user'],
        ['POST', '/api/auth/admin/set-role'],
        ['POST', '/api/auth/admin/ban-user'],
        ['POST', '/api/auth/admin/impersonate-user'],
        ['POST', '/api/auth/admin/remove-user'],
        // The endpoints of Better Auth plugins that are not installed
        ['POST', '/api/auth/sign-in/magic-link'],
        ['GET', '/api/auth/passkey/list-user-passkeys'],
        ['GET', '/api/auth/token'],
        ['GET', '/api/auth/jwks'],
        ['POST', '/api/auth/sign-in/anonymous'],
      ];

      for (const [method, url] of admin) {
        // eslint-disable-next-line no-await-in-loop
        const res =
          method === 'GET'
            ? await rq.get(url)
            : await rq.post(url, { body: { email: 'x@example.com', userId: 'x', role: 'admin' } });

        // The request rides inside the asserted object, so a failure names it
        expect({ method, url, status: res.statusCode }).toEqual({ method, url, status: 404 });
      }

      // username and two-factor are on by default, and the health endpoint answers
      const available = await rq.post('/api/auth/is-username-available', {
        body: { username: 'someone' },
      });

      expect(available.statusCode).toBe(200);
      expect(available.body).toEqual({ available: true });
      expect((await rq.get('/api/auth/ok')).statusCode).toBe(200);

      // The catch-all is not mounted for methods Better Auth does not use
      expect([404, 405]).toContain((await rq.delete('/api/auth/sign-out')).statusCode);
      expect([404, 405]).toContain((await rq.put('/api/auth/sign-out', { body: {} })).statusCode);
    });

    it('creates the hot-path indexes, one user per email, one account per provider and account id, and the rate limit table, in the database', async () => {
      const { schemaInspector } = strapi.db.dialect;
      const sessions = await schemaInspector.getIndexes('eu_sessions');
      const users = await schemaInspector.getIndexes('eu_users');
      const accounts = await schemaInspector.getIndexes('eu_accounts');

      expect(sessions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ columns: ['token'], type: 'unique' }),
          expect.objectContaining({ columns: ['user_id'] }),
        ])
      );
      expect(users).toEqual(
        expect.arrayContaining([expect.objectContaining({ columns: ['email'], type: 'unique' })])
      );

      // One index over the pair: Postgres's inspector lists its columns in another order than the
      // one they were declared in, and the pair is unique either way
      const pairs = accounts
        .filter((index: { type?: string }) => index.type === 'unique')
        .map((index: { columns: string[] }) => [...index.columns].sort());

      expect(pairs).toContainEqual(['account_id', 'provider_id']);

      // The rate limit is kept in the database, as in production, so its table exists
      expect(strapi.contentTypes['plugin::end-users.rate-limit'].collectionName).toBe(
        'eu_rate_limits'
      );
      expect(await strapi.db.connection.schema.hasTable('eu_rate_limits')).toBe(true);
    });

    it('exposes set-auth-token to a front end on another origin beside what the CORS middleware exposes, allows credentials, sets a cross-site cookie, and lets it send its Authorization header', async () => {
      const { email } = await signedUp();

      const res = await signIn(email, PASSWORD, FROM_FRONT_END);

      expect(res.statusCode).toBe(200);
      expect(res.headers['set-auth-token']).toEqual(expect.any(String));
      expect(res.headers['access-control-allow-origin']).toBe(TEST_ORIGIN);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers.vary).toMatch(/Origin/i);

      // Better Auth's Bearer plugin sets Access-Control-Expose-Headers itself, and a plain copy of its
      // value would replace what Strapi's CORS middleware put there
      const exposed = res.headers['access-control-expose-headers']
        .split(',')
        .map((header: string) => header.trim().toLowerCase());

      expect(exposed).toEqual(expect.arrayContaining(['x-request-id', 'set-auth-token']));

      // The session cookie of a front end on another site
      const cookie = ((res.headers['set-cookie'] ?? []) as unknown as string[]).find((value) =>
        value.startsWith('strapi.session_token=')
      );

      expect(cookie).toMatch(/SameSite=None/i);
      expect(cookie).toMatch(/Secure/i);
      expect(cookie).toMatch(/HttpOnly/i);

      // An origin that is not listed gets no CORS headers
      const outside = await signIn(email, PASSWORD, { Origin: UNTRUSTED });

      expect(outside.headers['access-control-allow-origin']).toBeUndefined();

      const preflight = await request(strapi.server.httpServer)
        .options('/api/auth/get-session')
        .set('Origin', TEST_ORIGIN)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization');

      expect(preflight.statusCode).toBe(204);
      expect(preflight.headers['access-control-allow-origin']).toBe(TEST_ORIGIN);
      expect(preflight.headers['access-control-allow-headers'].toLowerCase()).toContain(
        'authorization'
      );
    });

    // Better Auth skips its origin and CSRF checks when NODE_ENV is "test" and `advanced.disableOriginCheck`
    // is not set, so without the plugin setting it nothing in an API test shows that `trustedOrigins`
    // reaches Better Auth at all. These tests run under NODE_ENV=test on purpose.
    it('refuses a cookie session from an origin that is not trusted, and changes nothing', async () => {
      expect(process.env.NODE_ENV).toBe('test');

      const { email, documentId } = await signedUp();
      const cookie = cookieOf(
        await signIn(email, PASSWORD, FROM_FRONT_END),
        'strapi.session_token'
      );
      const post = (path: string, body: unknown, headers: Record<string, string>) =>
        rq.post(`/api/auth${path}`, { body, headers: { cookie, ...headers } });
      const nameOfUser = async () =>
        (await strapi.documents(USER_UID).findOne({ documentId })).name;

      for (const headers of [
        { Origin: UNTRUSTED },
        { Referer: `${UNTRUSTED}/page` },
        // no origin or referer at all
        {},
      ]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await post('/update-user', { name: 'Hijacked' }, headers);

        expect({ headers, status: res.statusCode }).toEqual({ headers, status: 403 });
        // eslint-disable-next-line no-await-in-loop
        expect(await nameOfUser()).toBe('Test');
      }

      const foreign = await post('/update-user', { name: 'Hijacked' }, { Origin: UNTRUSTED });

      expect(foreign.body).toMatchObject({ code: 'INVALID_ORIGIN' });

      const before = await count(SESSION_UID);

      expect((await post('/sign-out', {}, { Origin: UNTRUSTED })).statusCode).toBe(403);
      expect(await count(SESSION_UID)).toBe(before);
      expect((await rq.get('/api/auth/get-session', { headers: { cookie } })).body.user.email).toBe(
        email
      );

      // Sign-in too: the right password from the wrong origin gets no cookie
      const signInFromOutside = await signIn(email, PASSWORD, { Origin: UNTRUSTED });

      expect(signInFromOutside.statusCode).toBe(403);
      expect(signInFromOutside.headers['set-cookie']).toBeUndefined();
    });

    it('lets the trusted origin through, and leaves a Bearer request alone: it carries no cookie to forge', async () => {
      const { email, documentId } = await signedUp();
      const inRes = await signIn(email, PASSWORD, FROM_FRONT_END);
      const cookie = cookieOf(inRes, 'strapi.session_token');

      const renamed = await rq.post('/api/auth/update-user', {
        body: { name: 'Renamed' },
        headers: { cookie, ...FROM_FRONT_END },
      });

      expect(renamed.statusCode).toBe(200);
      expect((await strapi.documents(USER_UID).findOne({ documentId })).name).toBe('Renamed');

      const out = await rq.post('/api/auth/sign-out', {
        body: {},
        headers: { cookie, ...FROM_FRONT_END },
      });

      expect(out.statusCode).toBe(200);
      expect((await rq.get('/api/auth/get-session', { headers: { cookie } })).body).toBeNull();

      // A Bearer request from an untrusted origin
      const authorization = `Bearer ${(await signIn(email, PASSWORD, FROM_FRONT_END)).headers['set-auth-token']}`;
      const bearerOut = await rq.post('/api/auth/sign-out', {
        body: {},
        headers: { authorization, Origin: UNTRUSTED },
      });

      expect(bearerOut.statusCode).toBe(200);
    });

    it('lets the user set preferredLocale through /update-user and refuses lastSignInAt', async () => {
      const { email, documentId } = await signedUp();
      const cookie = cookieOf(
        await signIn(email, PASSWORD, FROM_FRONT_END),
        'strapi.session_token'
      );
      const update = (body: Record<string, unknown>) =>
        rq.post('/api/auth/update-user', { body, headers: { cookie, ...FROM_FRONT_END } });

      // Signing in set the date
      const signedIn = await strapi.documents(USER_UID).findOne({ documentId });

      expect(signedIn.lastSignInAt).toBeTruthy();

      expect((await update({ preferredLocale: 'fr' })).statusCode).toBe(200);
      expect((await strapi.documents(USER_UID).findOne({ documentId })).preferredLocale).toBe('fr');

      const refused = await update({ lastSignInAt: '2000-01-01T00:00:00.000Z' });

      expect(refused.statusCode).toBe(400);
      expect(
        new Date((await strapi.documents(USER_UID).findOne({ documentId })).lastSignInAt).getTime()
      ).toBe(new Date(signedIn.lastSignInAt).getTime());
    });
  });

  describe('the signed-in user and their profile', () => {
    it('answers GET /api/users/me with the user and nothing private about them', async () => {
      const { token, documentId, email } = await signedUp();

      const res = await rq.get('/api/users/me', { headers: bearer(token) });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({ documentId, email, name: 'Test' });

      // Moderation state is private, and so is the Better Auth role name
      for (const key of ['password', 'role', 'banned', 'banReason', 'banExpires']) {
        expect(res.body.data).not.toHaveProperty(key);
      }

      // What Better Auth's UI reads stays
      for (const key of ['emailVerified', 'twoFactorEnabled']) {
        expect(res.body.data).toHaveProperty(key);
      }

      // A token that names no session is a 401, and no credentials is a 403: Public is given nothing
      expect((await rq.get('/api/users/me', { headers: bearer('nope') })).statusCode).toBe(401);
      expect((await rq.get('/api/users/me')).statusCode).toBe(403);
      expect((await rq.get('/api/users/me/profile')).statusCode).toBe(403);
    });

    it('names its strategy end-users and leaves no single role on the user while compat is off', async () => {
      const { token } = await signedUp();

      const res = await rq.get('/api/end-users-test/strategy', { headers: bearer(token) });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('end-users');
      expect(res.body).not.toHaveProperty('role');
    });

    it('writes the profile fields a sign-up carries only when the registration list allows them', async () => {
      await setRegistrationFields(['company', 'newsletter']);

      try {
        const { documentId, token } = await signedUp({ company: 'Acme', newsletter: true });
        const mine = await rq.get('/api/users/me/profile', { headers: bearer(token) });

        expect(mine.statusCode).toBe(200);
        expect(mine.body.data).toMatchObject({ company: 'Acme', newsletter: true });
        expect(await profileOf(documentId)).toHaveLength(1);

        // One that is not sent stays at its default
        const other = await signedUp({ company: 'Other' });

        expect((await profileOf(other.documentId))[0]).toMatchObject({
          company: 'Other',
          newsletter: false,
        });

        await setRegistrationFields(['company']);

        // Refused with a 400 that names the key, and no user made: a field that is not on the list,
        // a key that is no field of the profile, `user`, and the user fields Better Auth keeps out of
        // client input (the list cannot widen those)
        const refused: Array<[string, unknown]> = [
          ['newsletter', true],
          ['isAdmin', true],
          ['user', 'someone-else'],
          ['roles', true],
          ['banned', true],
          ['twoFactorEnabled', true],
          ['role', 'admin'],
          ['banReason', 'x'],
          ['emailVerified', true],
        ];

        for (const [key, value] of refused) {
          const email = `refused-${key}@example.com`;
          // eslint-disable-next-line no-await-in-loop
          const res = await signUp(email, { [key]: value });
          // eslint-disable-next-line no-await-in-loop
          const users = await count(USER_UID, { email });

          // The key goes along, so a failure names it
          expect({ key, status: res.statusCode, message: res.body.message, users }).toEqual({
            key,
            status: 400,
            message: `${key} is not allowed at sign-up`,
            users: 0,
          });
        }

        // A value the profile does not take
        const tooLong = await signUp('too-long@example.com', {
          company: 'a company name that is far too long',
        });

        expect(tooLong.statusCode).toBe(400);
        expect(await count(USER_UID, { email: 'too-long@example.com' })).toBe(0);

        // While the list is empty, which it is until an administrator sets it, every field is refused
        await setRegistrationFields([]);

        const empty = await signUp('empty-list@example.com', { company: 'Acme' });

        expect(empty.statusCode).toBe(400);
        expect(empty.body.message).toBe('company is not allowed at sign-up');
      } finally {
        await setRegistrationFields([]);
      }
    });

    it('reads and updates only the caller`s own profile through /me/profile', async () => {
      await setRegistrationFields(['company']);

      try {
        const a = await signedUp({ company: 'A Corp' });
        const b = await signedUp({ company: 'B Corp' });

        const own = await rq.get('/api/users/me/profile', { headers: bearer(a.token) });
        const other = await rq.get('/api/users/me/profile', { headers: bearer(b.token) });

        expect(own.body.data.company).toBe('A Corp');
        expect(other.body.data.company).toBe('B Corp');

        // Nothing the request says moves it to someone else's: a filter on the profile is not
        // applied (there is one profile to answer with), and a filter through the relation may be
        // refused
        const byCompany = await rq.get('/api/users/me/profile?filters[company]=B Corp', {
          headers: bearer(a.token),
        });
        const byUser = await rq.get(
          `/api/users/me/profile?filters[user][documentId]=${b.documentId}`,
          { headers: bearer(a.token) }
        );

        expect(byCompany.statusCode).toBe(200);
        expect(byCompany.body.data.company).toBe('A Corp');
        expect(byUser.body.data?.company).not.toBe('B Corp');

        const res = await rq.put('/api/users/me/profile', {
          headers: bearer(a.token),
          body: { data: { company: 'A Inc', newsletter: true } },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject({ company: 'A Inc', newsletter: true });
        expect((await profileOf(a.documentId))[0]).toMatchObject({
          company: 'A Inc',
          newsletter: true,
        });
        expect((await profileOf(b.documentId))[0]).toMatchObject({ company: 'B Corp' });

        // A profile.update row that lists fields limits what this route writes: `company` only
        await setRolePermissions(
          strapi,
          'authenticated',
          DEFAULT_AUTHENTICATED_PERMISSIONS.map((permission) =>
            permission.action === `${PROFILE_UID}.update`
              ? { ...permission, properties: { fields: ['company'] } }
              : permission
          )
        );

        try {
          const outside = await rq.put('/api/users/me/profile', {
            headers: bearer(a.token),
            body: { data: { newsletter: true } },
          });

          expect(outside.statusCode).toBe(400);
          expect(outside.body.error.message).toContain('newsletter');

          const inside = await rq.put('/api/users/me/profile', {
            headers: bearer(a.token),
            body: { data: { company: 'Acme' } },
          });

          expect(inside.statusCode).toBe(200);
          expect(inside.body.data.company).toBe('Acme');
        } finally {
          await resetRoles(strapi);
        }

        // It cannot be given away, and a field the profile does not have, a value it does not take
        // and a body with no data are refused
        const away = await rq.put('/api/users/me/profile', {
          headers: bearer(a.token),
          body: { data: { user: { connect: [b.documentId] }, company: 'Mine' } },
        });

        expect(away.statusCode).toBe(400);
        expect(await profileOf(a.documentId)).toHaveLength(1);
        expect(await profileOf(b.documentId)).toHaveLength(1);

        for (const body of [
          { data: { nope: 1 } },
          { data: { company: 'a company name that is far too long' } },
          {},
        ]) {
          // eslint-disable-next-line no-await-in-loop
          const refused = await rq.put('/api/users/me/profile', { headers: bearer(a.token), body });

          expect({ body, status: refused.statusCode }).toEqual({ body, status: 400 });
        }
      } finally {
        await setRegistrationFields([]);
      }
    });

    it('answers 404 from /me/profile for a user who has no profile', async () => {
      const { documentId, token } = await signedUp();

      await strapi.db.query(PROFILE_UID).deleteMany({ where: {} });

      expect(await profileOf(documentId)).toHaveLength(0);
      expect((await rq.get('/api/users/me/profile', { headers: bearer(token) })).statusCode).toBe(
        404
      );
      expect(
        (
          await rq.put('/api/users/me/profile', {
            headers: bearer(token),
            body: { data: { company: 'x' } },
          })
        ).statusCode
      ).toBe(404);
    });

    it('gives no role the core routes of users or another user`s profile by default: 403 and 404', async () => {
      const a = await signedUp();
      const b = await signedUp();
      const [profile] = await profileOf(b.documentId);
      const headers = bearer(a.token);

      const answers = await Promise.all([
        rq.get('/api/users', { headers }),
        rq.get(`/api/users/${b.documentId}`, { headers }),
        rq.put(`/api/users/${b.documentId}`, { headers, body: { data: { name: 'Hacked' } } }),
        rq.delete(`/api/users/${b.documentId}`, { headers }),
        rq.get('/api/profiles', { headers }),
        rq.get(`/api/profiles/${profile.documentId}`, { headers }),
        rq.put(`/api/profiles/${profile.documentId}`, {
          headers,
          body: { data: { company: 'Hacked' } },
        }),
      ]);

      // The users' routes are no one's by default. The profiles' find, findOne and update are
      // Authenticated's, for the caller's own profile only: another user's is not found, and the
      // list holds the caller's own
      expect(answers.map((res) => res.statusCode)).toEqual([403, 403, 403, 403, 200, 404, 404]);
      expect(answers[4].body.data.map((entry) => entry.documentId)).not.toContain(
        profile.documentId
      );
      expect((await strapi.documents(USER_UID).findOne({ documentId: b.documentId })).name).toBe(
        'Test'
      );
      expect((await profileOf(b.documentId))[0].company).toBe(profile.company);
    });
  });

  describe('GET /api/end-users/permissions/me', () => {
    const URL = '/api/end-users/permissions/me';

    it('describes Public as a role with no subjects, and a signed-in user by their default grants', async () => {
      const anonymous = await rq.get(URL);

      expect(anonymous.statusCode).toBe(200);
      expect(anonymous.body.data.roles.map((r) => r.type)).toEqual(['public']);
      expect(anonymous.body.data.subjects).toEqual({});

      const { token } = await signedUp();
      const res = await rq.get(URL, { headers: bearer(token) });

      expect(res.statusCode).toBe(200);

      const owned = {
        fields: null,
        conditions: ['plugin::end-users.is-owner'],
        populateDepth: null,
      };

      expect(res.body.data.subjects['plugin::end-users.profile']).toEqual({
        find: owned,
        findOne: owned,
        update: owned,
      });
      expect(res.body.data.roles).toEqual([
        { documentId: expect.any(String), name: 'Authenticated', type: 'authenticated' },
      ]);
      expect(res.body.data.routes).toEqual(
        expect.arrayContaining([
          'plugin::end-users.me.find',
          'plugin::end-users.me.findProfile',
          'plugin::end-users.me.updateProfile',
          'plugin::end-users.profile.find',
          'plugin::end-users.profile.findOne',
          'plugin::end-users.profile.update',
        ])
      );
    });

    it('answers a signed-in user whose roles grant nothing: the route needs no grant', async () => {
      await setRolePermissions(strapi, 'authenticated', []);

      try {
        const { token } = await signedUp();
        const res = await rq.get(URL, { headers: bearer(token) });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toEqual({
          roles: [{ documentId: expect.any(String), name: 'Authenticated', type: 'authenticated' }],
          routes: [],
          subjects: {},
        });
      } finally {
        await resetRoles(strapi);
      }
    });

    it('refuses an API token', async () => {
      const admin = await createAuthRequest({ strapi });
      const created = await admin({
        method: 'POST',
        url: '/admin/api-tokens',
        body: {
          name: `${TOKEN_NAME}-${Date.now()}`,
          description: 'full access',
          type: 'full-access',
        },
      });

      expect(created.status).toBe(201);

      const api = createContentAPIRequest({ strapi, auth: { token: created.body.data.accessKey } });

      expect((await api.get('/end-users/permissions/me')).statusCode).toBe(403);
    });
  });

  describe('a user the engine looks after, whichever way they were made', () => {
    it('gives a new sign-up the Authenticated role and never Public, and keeps the roles out of the answer', async () => {
      const up = await signUp('newbie@example.com');

      expect(up.statusCode).toBe(200);
      expect(up.body.user).not.toHaveProperty('roles');
      expect((await rolesOf(up.body.user.id)).map((role) => role.type)).toEqual(['authenticated']);
      expect(await strapi.documents(ROLE_UID).count({ filters: { type: 'public' } })).toBe(1);
    });

    it('gives a new sign-up every default role the settings name', async () => {
      const editors = await strapi.plugin('end-users').service('role').create({ name: 'Editors' });
      const authenticated = await strapi.db
        .query(ROLE_UID)
        .findOne({ where: { type: 'authenticated' } });

      await settings.set({
        signUp: { defaultRoles: [authenticated.documentId, editors.documentId] },
      });

      try {
        const up = await signUp('two-roles@example.com');

        expect(up.statusCode).toBe(200);
        expect((await rolesOf(up.body.user.id)).map((role) => role.documentId).sort()).toEqual(
          [authenticated.documentId, editors.documentId].sort()
        );
      } finally {
        await settings.set({ signUp: { defaultRoles: [] } });
      }
    });

    it('refuses sign-up with 403 SIGN_UP_DISABLED when sign-up is off, and lets an existing user sign in', async () => {
      const existing = await signedUp();

      await settings.set({ signUp: { enabled: false } });

      try {
        const up = await signUp('late@example.com');

        expect(up.statusCode).toBe(403);
        expect(up.body.code).toBe('SIGN_UP_DISABLED');
        expect(await count(USER_UID, { email: 'late@example.com' })).toBe(0);
        expect((await signIn(existing.email)).statusCode).toBe(200);
      } finally {
        await settings.set({ signUp: { enabled: true } });
      }
    });

    it('answers 404 to the endpoints of a sign-in method turned off in the settings', async () => {
      await settings.set({ methods: { username: false } });

      try {
        const res = await rq.post('/api/auth/sign-in/username', {
          body: { username: 'nobody', password: PASSWORD },
        });

        expect(res.statusCode).toBe(404);
      } finally {
        await settings.set({ methods: { username: true } });
      }
    });

    it('lets a user created in the Content Manager sign in with the password it was made with', async () => {
      const created = await strapi
        .documents(USER_UID)
        .create({ data: { email: 'cm@example.com', name: 'CM', password: PASSWORD } });

      expect(created).not.toHaveProperty('password');
      expect((await signIn('cm@example.com')).statusCode).toBe(200);
      expect((await signIn('cm@example.com', 'Another!pass1')).statusCode).toBe(401);

      // The engine's hash is on a credential account, never the password and never on the user row
      const account = await strapi.db
        .query(ACCOUNT_UID)
        .findOne({ where: { userId: created.documentId, providerId: 'credential' } });

      expect(account.password).toBeTruthy();
      expect(account.password).not.toBe(PASSWORD);

      // The user has the default role and a profile, as a sign-up would give them
      expect((await rolesOf(created.documentId)).map((role) => role.type)).toEqual([
        'authenticated',
      ]);
      expect(await profileOf(created.documentId)).toHaveLength(1);

      // A password the engine refuses leaves no user and no profile behind
      const profiles = await count(PROFILE_UID);

      await expect(
        strapi
          .documents(USER_UID)
          .create({ data: { email: 'cm-short@example.com', name: 'CM', password: 'short' } })
      ).rejects.toThrow(/at least \d+ characters/);
      expect(await count(USER_UID, { email: 'cm-short@example.com' })).toBe(0);
      expect(await count(PROFILE_UID)).toBe(profiles);

      // Made without a password, they cannot sign in with one yet
      const bare = await strapi
        .documents(USER_UID)
        .create({ data: { email: 'cm-bare@example.com', name: 'CM' } });

      expect(await count(ACCOUNT_UID, { userId: bare.documentId })).toBe(0);
      expect((await signIn('cm-bare@example.com')).statusCode).toBe(401);
    });

    it('signs a user out everywhere when their password changes or they are banned, and clears them away when they are deleted', async () => {
      const me = (token: string) => rq.get('/api/users/me', { headers: bearer(token) });

      // A new password: the old one stops working, and so does every session
      const changed = await signedUp();

      // A second session, on another device
      await signIn(changed.email);

      expect(await count(SESSION_UID, { userId: changed.documentId })).toBe(2);
      expect((await me(changed.token)).statusCode).toBe(200);

      await strapi.documents(USER_UID).update({
        documentId: changed.documentId,
        data: { password: 'NewPassw0rd!long' },
      });

      expect(await count(SESSION_UID, { userId: changed.documentId })).toBe(0);
      expect((await me(changed.token)).statusCode).toBe(401);
      expect((await signIn(changed.email, 'NewPassw0rd!long')).statusCode).toBe(200);
      expect((await signIn(changed.email)).statusCode).toBe(401);

      // An update that sends no password, or an empty one, signs no one out
      const kept = await signedUp();

      await strapi.documents(USER_UID).update({
        documentId: kept.documentId,
        data: { name: 'Renamed', password: '' },
      });

      expect((await me(kept.token)).statusCode).toBe(200);
      expect((await signIn(kept.email)).statusCode).toBe(200);

      // A ban: the session is gone, so the next request is a 401, and the user cannot sign in again
      const banned = await signedUp();
      const bystander = await signedUp();

      await strapi
        .documents(USER_UID)
        .update({ documentId: banned.documentId, data: { banned: true, banReason: 'spam' } });

      expect(await count(SESSION_UID, { userId: banned.documentId })).toBe(0);
      expect((await me(banned.token)).statusCode).toBe(401);
      expect((await signIn(banned.email)).statusCode).toBe(403);
      expect((await me(bystander.token)).statusCode).toBe(200);

      // A delete takes the sessions, the accounts, the profile and the verification rows that hold
      // the user, and no one else's
      const gone = await signedUp();

      await strapi.db.query(VERIFICATION_UID).create({
        data: {
          identifier: `reset-password:gone-${gone.documentId}`,
          value: gone.documentId,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      await strapi.db.query(VERIFICATION_UID).create({
        data: {
          identifier: `reset-password:kept-${bystander.documentId}`,
          value: bystander.documentId,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      expect(await profileOf(gone.documentId)).toHaveLength(1);

      await strapi.documents(USER_UID).delete({ documentId: gone.documentId });

      expect(await count(SESSION_UID, { userId: gone.documentId })).toBe(0);
      expect(await count(ACCOUNT_UID, { userId: gone.documentId })).toBe(0);
      expect(await count(VERIFICATION_UID, { value: gone.documentId })).toBe(0);
      expect(await profileOf(gone.documentId)).toHaveLength(0);
      expect(await count(USER_UID, { documentId: gone.documentId })).toBe(0);
      expect((await me(gone.token)).statusCode).toBe(401);

      expect(await count(VERIFICATION_UID, { value: bystander.documentId })).toBe(1);
      expect(await count(ACCOUNT_UID, { userId: bystander.documentId })).toBeGreaterThan(0);
      expect(await profileOf(bystander.documentId)).toHaveLength(1);
      expect((await me(bystander.token)).statusCode).toBe(200);
    });
  });
});

describe('end-users: rate limiting', () => {
  let strapi;
  let rq;

  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: { rateLimit: { enabled: true, window: 60, max: 3 } },
    });
    rq = createRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  it('answers 429 to the fourth sign-in within the window', async () => {
    const signIn = () =>
      rq.post('/api/auth/sign-in/email', {
        body: { email: 'limited@example.com', password: PASSWORD },
      });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      expect((await signIn()).statusCode).not.toBe(429);
    }

    expect((await signIn()).statusCode).toBe(429);
  });
});

describe('end-users: lockout after failed sign-ins and the password policy', () => {
  let strapi;
  let rq;

  beforeAll(async () => {
    // Many sign-ins from one address in a row: the rate limiter is not what is under test
    // The front end of the sign-ups is a trusted origin; the lockout counters of an earlier run
    // are in the shared database (`eu_rate_limits`), so they are cleared before the first attempt
    strapi = await createEndUsersInstance({
      pluginConfig: { rateLimit: { enabled: false }, trustedOrigins: [TEST_ORIGIN] },
    });
    rq = createRequest({ strapi });

    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
  });

  afterAll(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await strapi.destroy();
  });

  it('signs in by username, answers a wrong password as always, and locks on the sixth failure', async () => {
    const email = 'locked@example.com';
    const signedUp = await rq.post('/api/auth/sign-up/email', {
      body: { email, password: PASSWORD, name: 'Locked', username: 'locked_user' },
      headers: FROM_FRONT_END,
    });

    expect(signedUp.statusCode).toBe(200);

    const byUsername = (password: string) =>
      rq.post('/api/auth/sign-in/username', { body: { username: 'locked_user', password } });
    const byEmail = (password: string) =>
      rq.post('/api/auth/sign-in/email', { body: { email, password } });

    expect((await byUsername(PASSWORD)).statusCode).toBe(200);

    const wrong = await byEmail('not-the-password');

    expect(wrong.statusCode).toBe(401);
    expect(wrong.body.code).toBe('INVALID_EMAIL_OR_PASSWORD');

    // Four more failures make five; the lock is in force from the next request on
    for (let attempt = 0; attempt < 4; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      expect((await byEmail('not-the-password')).statusCode).toBe(401);
    }

    const locked = await byEmail('not-the-password');

    expect(locked.statusCode).toBe(403);
    expect(locked.body).toEqual({
      code: 'ACCOUNT_LOCKED',
      message: 'This account is locked. Try again later.',
    });

    // Not even the right password, and by either way in; the answer never says when it ends
    const right = await byEmail(PASSWORD);
    const rightByUsername = await byUsername(PASSWORD);

    expect(right.statusCode).toBe(403);
    expect(right.body).toEqual(locked.body);
    expect(rightByUsername.statusCode).toBe(403);
    expect(rightByUsername.body).toEqual(locked.body);
  });

  it('locks an address nobody has after the same number of failures, with the same answer', async () => {
    const stranger = (password: string) =>
      rq.post('/api/auth/sign-in/email', { body: { email: 'nobody@example.com', password } });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      expect((await stranger('not-the-password')).statusCode).toBe(401);
    }

    const locked = await stranger('not-the-password');

    // The body of a locked account: whether an address has an account is not for the lock to tell
    expect(locked.statusCode).toBe(403);
    expect(locked.body).toEqual({
      code: 'ACCOUNT_LOCKED',
      message: 'This account is locked. Try again later.',
    });
  });

  it('changes the password and signs the other session out, and refuses a weak new one with PASSWORD_TOO_WEAK', async () => {
    const email = 'policy@example.com';
    const signedUp = await rq.post('/api/auth/sign-up/email', {
      body: { email, password: PASSWORD, name: 'Policy' },
      headers: FROM_FRONT_END,
    });

    expect(signedUp.statusCode).toBe(200);

    const cookie = cookieOf(signedUp, 'strapi.session_token');
    const other = cookieOf(
      await rq.post('/api/auth/sign-in/email', { body: { email, password: PASSWORD } }),
      'strapi.session_token'
    );
    const change = (newPassword: string) =>
      rq.post('/api/auth/change-password', {
        body: { currentPassword: PASSWORD, newPassword, revokeOtherSessions: true },
        headers: { ...FROM_FRONT_END, Cookie: cookie },
      });

    const weak = await change('short');

    expect(weak.statusCode).toBe(400);
    expect(weak.body.code).toBe('PASSWORD_TOO_WEAK');

    // A refused change leaves the other session alone
    expect(
      (await rq.get('/api/auth/get-session', { headers: { cookie: other } })).body
    ).not.toBeNull();

    const changed = await change('An0ther!password');

    expect(changed.statusCode).toBe(200);

    // Better Auth ends every session, the caller's included, and gives the caller a new one
    const renewed = cookieOf(changed, 'strapi.session_token');

    expect(renewed).toBeTruthy();
    expect((await rq.get('/api/auth/get-session', { headers: { cookie: other } })).body).toBeNull();
    expect((await rq.get('/api/auth/get-session', { headers: { cookie } })).body).toBeNull();
    expect(
      (await rq.get('/api/auth/get-session', { headers: { cookie: renewed } })).body
    ).not.toBeNull();
  });
});

describe('end-users: the emails the engine sends', () => {
  let strapi;
  let rq;
  let settings;
  let templates;
  let accounts = 0;

  /** The first link in the text of an email, as a path on this server */
  const linkOf = (email: { text: string }) => {
    const url = new URL(email.text.match(/https?:\/\/\S+/)?.[0] as string);

    return `${url.pathname}${url.search}`;
  };

  /** A user who signed up, with the session cookie that signing up gave them */
  const signedUp = async () => {
    accounts += 1;

    const email = `email-${accounts}@example.com`;
    const res = await rq.post('/api/auth/sign-up/email', {
      body: { email, password: PASSWORD, name: 'Test' },
      headers: FROM_FRONT_END,
    });

    expect(res.statusCode).toBe(200);

    return { email, cookie: cookieOf(res, 'strapi.session_token') };
  };

  beforeAll(async () => {
    strapi = await createEndUsersInstance({ pluginConfig: { trustedOrigins: [TEST_ORIGIN] } });
    rq = createRequest({ strapi });
    settings = strapi.plugin('end-users').service('settings');
    templates = strapi.plugin('email').service('templates');
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  beforeEach(async () => {
    clearSentEmails();
    await settings.set({
      signUp: { requireEmailVerification: false },
      redirects: { emailVerified: '/verified', passwordReset: '/reset' },
    });
    await strapi.plugin('end-users').service('engine').reload();
  });

  afterEach(async () => {
    await templates.reset('end-users.reset-password', 'en');
  });

  it('sends one reset email whose link sets the password once', async () => {
    const { email } = await signedUp();

    clearSentEmails();

    const requested = await rq.post('/api/auth/request-password-reset', {
      body: { email },
      headers: FROM_FRONT_END,
    });

    expect(requested.statusCode).toBe(200);
    expect(sentEmails()).toHaveLength(1);
    expect(sentEmails()[0].to).toBe(email);

    // The link lands on the reset page of the settings, with the token
    const followed = await rq.get(linkOf(sentEmails()[0]));
    const landed = new URL(followed.headers.location, 'http://localhost');

    expect(followed.statusCode).toBe(302);
    expect(landed.pathname).toBe('/reset');

    const token = landed.searchParams.get('token');
    const reset = (newPassword: string) =>
      rq.post('/api/auth/reset-password', {
        body: { newPassword, token },
        headers: FROM_FRONT_END,
      });

    expect((await reset('An0ther!password')).statusCode).toBe(200);
    expect((await reset('Yet-an0ther!password')).statusCode).toBe(400);
    expect(
      (await rq.post('/api/auth/sign-in/email', { body: { email, password: 'An0ther!password' } }))
        .statusCode
    ).toBe(200);
  });

  it('sends verify-email at sign-up when verification is required, and its link lands on the settings redirect', async () => {
    await settings.set({ signUp: { requireEmailVerification: true } });
    await strapi.plugin('end-users').service('engine').reload();

    const res = await rq.post('/api/auth/sign-up/email', {
      body: { email: 'verify-me@example.com', password: PASSWORD, name: 'Test' },
      headers: FROM_FRONT_END,
    });

    expect(res.statusCode).toBe(200);
    expect(sentEmails()).toHaveLength(1);
    expect(sentEmails()[0].to).toBe('verify-me@example.com');
    expect(sentEmails()[0].subject).toBe('Confirm your email address');

    const followed = await rq.get(linkOf(sentEmails()[0]));

    expect(followed.statusCode).toBe(302);
    expect(followed.headers.location).toBe('/verified');
    expect(
      await strapi.db
        .query(USER_UID)
        .count({ where: { email: 'verify-me@example.com', emailVerified: true } })
    ).toBe(1);
    // The welcome follows the verification, once
    expect(sentEmails().map((email) => email.subject)).toEqual([
      'Confirm your email address',
      'Welcome',
    ]);
  });

  it('uses the subject an administrator edited on the next reset email', async () => {
    const { email } = await signedUp();

    await templates.update('end-users.reset-password', 'en', {
      subject: 'Choose a new password for {{ user.email }}',
      html: '<p><a href="{{ url }}">Reset</a></p>',
      text: 'Reset: {{ url }}',
    });
    clearSentEmails();

    await rq.post('/api/auth/request-password-reset', { body: { email }, headers: FROM_FRONT_END });

    expect(sentEmails()).toHaveLength(1);
    expect(sentEmails()[0].subject).toBe(`Choose a new password for ${email}`);
  });

  it('sends change-email to the new address, and following it changes the email', async () => {
    const { email, cookie } = await signedUp();

    clearSentEmails();

    const changed = await rq.post('/api/auth/change-email', {
      body: { newEmail: 'moved@example.com' },
      headers: { ...FROM_FRONT_END, Cookie: cookie },
    });

    expect(changed.statusCode).toBe(200);
    expect(sentEmails()).toHaveLength(1);
    expect(sentEmails()[0].to).toBe('moved@example.com');
    expect(sentEmails()[0].subject).toBe('Confirm your new email address');

    const followed = await rq.get(linkOf(sentEmails()[0]), { headers: { Cookie: cookie } });

    expect(followed.statusCode).toBe(302);
    expect(await strapi.db.query(USER_UID).count({ where: { email: 'moved@example.com' } })).toBe(
      1
    );
    expect(await strapi.db.query(USER_UID).count({ where: { email } })).toBe(0);
  });
});
