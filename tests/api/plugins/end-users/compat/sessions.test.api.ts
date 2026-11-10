/**
 * The Users & Permissions refresh routes, `POST /api/auth/refresh`, `POST /api/auth/logout`,
 * `GET /api/auth/sessions` and `DELETE /api/auth/sessions/:sessionId`, over the whole stack. The
 * first instance has them on (with the legacy secret and a completed migration, for the old tokens),
 * the second has them off: one instance at a time per file.
 */
import { createRequest } from 'api-tests/request';
import { emailsAfter } from '../utils/wait';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import { compatConfig, seedUpUser } from '../utils/compat';
import { clearSentEmails, sentEmails } from '../utils/email-capture-provider';
import { makeLegacySecret, mintOldRefreshToken } from '../utils/legacy-tokens';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  bearer,
  emptyTables,
  resetRoles,
} from '../utils/permissions';
import { resetDatabase } from '../utils/reset-database';

const LEGACY_ROUTE = '/api/end-users-test/legacy';
const COOKIE = 'strapi_up_refresh';
const DAY_MS = 24 * 60 * 60 * 1000;
const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let strapi;
let rq;

const reset = async () => {
  await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
  await resetRoles(strapi);
};

const routes = ({ strapi: instance }) => {
  instance.server.routes({
    type: 'content-api',
    routes: [
      {
        method: 'GET',
        path: '/end-users-test/legacy',
        handler(ctx) {
          ctx.body = { documentId: ctx.state.user.documentId };
        },
        config: {
          auth: {
            strategies: ['users-permissions'],
            scope: ['plugin::end-users.permissions.forCaller'],
          },
        },
      },
    ],
  });
};

const signIn = (
  identifier: string,
  password: string,
  extra: Record<string, unknown> = {},
  headers = {}
) => rq.post('/api/auth/local', { body: { identifier, password, ...extra }, headers });

const refresh = (body: unknown, headers: Record<string, string> = {}) =>
  rq.post('/api/auth/refresh', { body, headers });

const cookiesOf = (res): string[] => (res.headers['set-cookie'] ?? []) as string[];

describe('end-users compat: refresh, logout and sessions', () => {
  const LEGACY_SECRET = makeLegacySecret();
  const store = () => strapi.store({ type: 'plugin', name: 'end-users' });

  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: {
        ...compatConfig({
          legacyJwt: { secret: LEGACY_SECRET, until: '2099-12-31' },
          refresh: { enabled: true },
        }),
        trustedOrigins: [TEST_ORIGIN],
      },
      register: routes,
    });
    rq = createRequest({ strapi });
  });

  beforeEach(async () => {
    await reset();
    await store().set({
      key: 'migration',
      value: { status: 'completed', cutoverAt: new Date(Date.now() + DAY_MS).toISOString() },
    });
    strapi.plugin('end-users').service('compat').clearCutoverCache();
  });

  afterAll(async () => {
    await store().delete({ key: 'migration' });
    strapi.plugin('end-users').service('compat').clearCutoverCache();
    await reset();
    await strapi.destroy();
  });

  it('returns { jwt, refreshToken, user } and sets the cookie only with httpOnly or the header', async () => {
    const user = await seedUpUser(strapi, { email: 'ann@example.com' });

    const plain = await signIn(user.email, user.password);

    expect(plain.status).toBe(200);
    expect(plain.body).toMatchObject({
      jwt: expect.any(String),
      refreshToken: plain.body.jwt,
      user: { email: user.email },
    });
    expect(cookiesOf(plain).join(';')).not.toContain(COOKIE);

    const asked = await signIn(
      user.email,
      user.password,
      {},
      { 'x-strapi-refresh-cookie': 'httpOnly' }
    );

    expect(asked.body.jwt).toEqual(expect.any(String));
    expect(asked.body).not.toHaveProperty('refreshToken');
    expect(cookiesOf(asked).join(';')).toMatch(new RegExp(`${COOKIE}=.*HttpOnly`, 'i'));
  });

  it('refresh rotates and a replay is 401', async () => {
    const user = await seedUpUser(strapi, { email: 'bea@example.com' });
    const { body } = await signIn(user.email, user.password);

    const rotated = await refresh({ refreshToken: body.refreshToken });

    expect(rotated.status).toBe(200);
    expect(rotated.body.refreshToken).toEqual(expect.any(String));
    expect(rotated.body.refreshToken).not.toBe(body.refreshToken);
    expect((await rq.get('/api/users/me', { headers: bearer(rotated.body.jwt) })).status).toBe(200);

    const replay = await refresh({ refreshToken: body.refreshToken });

    expect(replay.status).toBe(401);
    expect(replay.body.error.message).toBe('Invalid refresh token');
    expect((await refresh({})).status).toBe(400);
  });

  it('five refreshes with one token give one 200, four 401 and one live session', async () => {
    const racing = async (refreshToken: string) => {
      const answers = await Promise.all(Array.from({ length: 5 }, () => refresh({ refreshToken })));
      const won = answers.filter((answer) => answer.status === 200);

      expect(won).toHaveLength(1);
      expect(answers.filter((answer) => answer.status === 401)).toHaveLength(4);

      return won[0].body.jwt as string;
    };

    const user = await seedUpUser(strapi, { email: 'kai@example.com' });
    const { body } = await signIn(user.email, user.password);
    const jwt = await racing(body.refreshToken);

    const listed = await rq.get('/api/auth/sessions', { headers: bearer(jwt) });

    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);

    // The same for an old refresh token: one exchange wins and leaves one session behind
    const other = await seedUpUser(strapi, { email: 'lou@example.com' });
    const old = await mintOldRefreshToken(strapi, other.id, 'old-device');
    const exchanged = await racing(old.refreshToken);

    expect(
      (await rq.get('/api/auth/sessions', { headers: bearer(exchanged) })).body.data
    ).toHaveLength(1);
  });

  it('refresh works from the cookie', async () => {
    const user = await seedUpUser(strapi, { email: 'cy@example.com' });
    const asked = await signIn(
      user.email,
      user.password,
      {},
      { 'x-strapi-refresh-cookie': 'httpOnly' }
    );
    const cookie = cookiesOf(asked)
      .map((line) => line.split(';')[0])
      .join('; ');

    const res = await refresh(
      {},
      { cookie, origin: TEST_ORIGIN, 'x-strapi-refresh-cookie': 'httpOnly' }
    );

    expect(res.status).toBe(200);
    expect(res.body.jwt).toEqual(expect.any(String));
    expect(res.body).not.toHaveProperty('refreshToken');
    expect(cookiesOf(res).join(';')).toContain(`${COOKIE}=`);
  });

  it('logout with scope all signs every session out', async () => {
    const user = await seedUpUser(strapi, { email: 'dee@example.com' });
    const first = await signIn(user.email, user.password);
    const second = await signIn(user.email, user.password);

    const out = await rq.post('/api/auth/logout', {
      body: { scope: 'all' },
      headers: bearer(first.body.jwt),
    });

    expect(out.status).toBe(200);
    expect(out.body).toEqual({ ok: true });

    for (const { body } of [first, second]) {
      expect((await rq.get('/api/users/me', { headers: bearer(body.jwt) })).status).toBe(401);
    }
  });

  it('a device logout leaves other devices', async () => {
    const user = await seedUpUser(strapi, { email: 'eve@example.com' });
    const phone = await signIn(user.email, user.password, { deviceId: 'phone' });
    const laptop = await signIn(user.email, user.password, { deviceId: 'laptop' });

    const out = await rq.post('/api/auth/logout', {
      body: { deviceId: 'laptop' },
      headers: bearer(phone.body.jwt),
    });

    expect(out.status).toBe(200);
    expect((await rq.get('/api/users/me', { headers: bearer(laptop.body.jwt) })).status).toBe(401);
    expect((await rq.get('/api/users/me', { headers: bearer(phone.body.jwt) })).status).toBe(200);
  });

  it("lists, revokes by DELETE, and answers Session not found for another user's session", async () => {
    const ann = await seedUpUser(strapi, { email: 'fay@example.com' });
    const bob = await seedUpUser(strapi, { email: 'gus@example.com' });
    const phone = await signIn(
      ann.email,
      ann.password,
      { deviceId: 'phone' },
      { 'user-agent': CHROME }
    );
    await signIn(ann.email, ann.password, { deviceId: 'laptop' });
    const bobs = await signIn(bob.email, bob.password, { deviceId: 'other' });

    const listed = await rq.get('/api/auth/sessions', { headers: bearer(phone.body.jwt) });

    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(2);
    expect(listed.body.data[0]).toMatchObject({
      deviceId: 'phone',
      deviceName: 'Chrome on macOS',
      current: true,
    });

    const [{ id: bobsSession }] = (
      await rq.get('/api/auth/sessions', { headers: bearer(bobs.body.jwt) })
    ).body.data;
    const foreign = await rq.delete(`/api/auth/sessions/${bobsSession}`, {
      headers: bearer(phone.body.jwt),
    });

    expect(foreign.status).toBe(404);
    expect(foreign.body.error.message).toBe('Session not found');

    const laptop = listed.body.data.find((entry) => entry.deviceId === 'laptop');
    const revoked = await rq.delete(`/api/auth/sessions/${laptop.id}`, {
      headers: bearer(phone.body.jwt),
    });

    expect(revoked.status).toBe(200);
    expect(revoked.body).toEqual({ data: {} });
    expect(
      (await rq.get('/api/auth/sessions', { headers: bearer(phone.body.jwt) })).body.data
    ).toHaveLength(1);
  });

  it('an old refresh token from before the cutover exchanges for a session', async () => {
    const user = await seedUpUser(strapi, { email: 'hal@example.com' });
    const old = await mintOldRefreshToken(strapi, user.id, 'old-device');

    const res = await refresh({ refreshToken: old.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.jwt).toEqual(expect.any(String));
    expect((await rq.get('/api/users/me', { headers: bearer(res.body.jwt) })).status).toBe(200);

    const listed = await rq.get('/api/auth/sessions', { headers: bearer(res.body.jwt) });

    expect(listed.body.data[0]).toMatchObject({ deviceId: 'old-device', current: true });
    // The old token is spent
    expect((await refresh({ refreshToken: old.refreshToken })).status).toBe(401);
  });

  describe('the old refresh sessions of a user, after the password is changed or the user signs out everywhere', () => {
    const NEW_PASSWORD = 'N3w-Passw0rd!long';

    it('a password change signs them out', async () => {
      const user = await seedUpUser(strapi, { email: 'ned@example.com' });
      const old = await mintOldRefreshToken(strapi, user.id, 'old-device');
      const current = await signIn(user.email, user.password);

      const changed = await rq.post('/api/auth/change-password', {
        headers: bearer(current.body.jwt),
        body: {
          currentPassword: user.password,
          password: NEW_PASSWORD,
          passwordConfirmation: NEW_PASSWORD,
        },
      });

      expect(changed.status).toBe(200);
      expect((await refresh({ refreshToken: old.refreshToken })).status).toBe(401);
    });

    it('a password reset signs them out', async () => {
      const user = await seedUpUser(strapi, { email: 'olly@example.com' });
      const old = await mintOldRefreshToken(strapi, user.id, 'old-device');

      const settings = strapi.plugin('end-users').service('settings');

      await settings.set({ redirects: { passwordReset: '/reset' } });
      clearSentEmails();

      expect(
        (await rq.post('/api/auth/forgot-password', { body: { email: user.email } })).status
      ).toBe(200);

      const link = new URL(
        (await emailsAfter(1, 3000))[0].text.match(/https?:\/\/\S+/)?.[0] as string
      );
      const reset = await rq.post('/api/auth/reset-password', {
        body: {
          code: link.searchParams.get('code'),
          password: NEW_PASSWORD,
          passwordConfirmation: NEW_PASSWORD,
        },
      });

      await settings.set({ redirects: { passwordReset: null } });

      expect(reset.status).toBe(200);
      expect((await refresh({ refreshToken: old.refreshToken })).status).toBe(401);
    });

    it('signing out everywhere signs them out', async () => {
      const user = await seedUpUser(strapi, { email: 'pat@example.com' });
      const old = await mintOldRefreshToken(strapi, user.id, 'old-device');
      const current = await signIn(user.email, user.password);

      const out = await rq.post('/api/auth/logout', {
        body: { scope: 'all' },
        headers: bearer(current.body.jwt),
      });

      expect(out.status).toBe(200);
      expect((await refresh({ refreshToken: old.refreshToken })).status).toBe(401);
    });
  });

  it('an old access token is not accepted as a refresh token', async () => {
    const user = await seedUpUser(strapi, { email: 'mia@example.com' });
    const current = await signIn(user.email, user.password);
    const old = await mintOldRefreshToken(strapi, user.id, 'old-device');

    const res = await refresh({ refreshToken: old.accessToken });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid refresh token');

    // No session was made for it
    const listed = await rq.get('/api/auth/sessions', { headers: bearer(current.body.jwt) });

    expect(listed.body.data).toHaveLength(1);
  });

  it('an old access token works as a Bearer token', async () => {
    const user = await seedUpUser(strapi, { email: 'ivy@example.com' });
    const old = await mintOldRefreshToken(strapi, user.id, 'old-device');

    const res = await rq.get(LEGACY_ROUTE, { headers: bearer(old.accessToken) });

    expect(res.status).toBe(200);
    expect(res.body.documentId).toBe(user.documentId);
  });
});

describe('end-users compat: refresh routes off', () => {
  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: { ...compatConfig(), trustedOrigins: [TEST_ORIGIN] },
    });
    rq = createRequest({ strapi });
  });

  afterAll(async () => {
    await reset();
    await strapi.destroy();
    await resetDatabase();
  });

  it('answers 404 on refresh, logout and sessions with refresh off', async () => {
    await reset();

    const user = await seedUpUser(strapi, { email: 'jon@example.com' });
    const { body } = await signIn(user.email, user.password);

    expect(body).not.toHaveProperty('refreshToken');

    const headers = bearer(body.jwt);

    expect((await refresh({ refreshToken: body.jwt })).status).toBe(404);
    expect((await rq.post('/api/auth/logout', { body: {}, headers })).status).toBe(404);
    expect((await rq.get('/api/auth/sessions', { headers })).status).toBe(404);
    expect((await rq.delete('/api/auth/sessions/anything', { headers })).status).toBe(404);
  });
});
