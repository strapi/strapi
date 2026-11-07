/**
 * The Users & Permissions compatible sign-in, `POST /api/auth/local`, over the whole stack. The
 * file's setup (the instance, the config and the helpers) is at the top; each area has its own
 * `describe`. The rate-limit case needs rate limiting on, so it runs in a second instance after the
 * first one is gone (one instance at a time per file).
 */
import { createRequest } from 'api-tests/request';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import { compatConfig, seedUpUser } from '../utils/compat';
import { clearSentEmails, sentEmails } from '../utils/email-capture-provider';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  TEST_PASSWORD as PASSWORD,
  bearer,
  createSignedInUser,
  emptyTables,
  resetRoles,
  row,
  setRolePermissions,
} from '../utils/permissions';

const USER_UID = 'plugin::end-users.user';
const WRONG = 'not-the-password';
const INVALID = 'Invalid identifier or password';

let strapi;
let rq;
let settings;
/** What `entry.create` was emitted with, collected by a listener the instance registers at bootstrap. */
const created: Array<{ uid: string; entry: Record<string, unknown> }> = [];

const signIn = (identifier: unknown, password: unknown = PASSWORD, extra = {}) =>
  rq.post('/api/auth/local', { body: { identifier, password, ...extra } });

const register = (body: Record<string, unknown>) => rq.post('/api/auth/local/register', { body });

const resetState = async () => {
  await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
  await resetRoles(strapi);
  await settings.set({
    methods: { emailPassword: true, username: true },
    signUp: { enabled: true, requireEmailVerification: false },
  });
};

describe('end-users compat: sign-in', () => {
  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: { ...compatConfig(), trustedOrigins: [TEST_ORIGIN] },
      async bootstrap({ strapi: instance }) {
        instance.eventHub.on('entry.create', (event: { uid: string; entry: never }) => {
          created.push(event);
        });
      },
      // Two routes pinned to the old strategy name: one echoes what the strategy put on the
      // context, one needs an `api::` permission.
      async register({ strapi: instance }) {
        instance.server.routes({
          type: 'content-api',
          routes: [
            {
              method: 'GET',
              path: '/end-users-test/strategy',
              handler(ctx) {
                ctx.body = { name: ctx.state.auth.strategy.name, role: ctx.state.user.role };
              },
              config: { auth: { strategies: ['users-permissions'] } },
            },
            {
              method: 'GET',
              path: '/end-users-test/governed',
              handler(ctx) {
                ctx.body = { ok: true };
              },
              config: {
                auth: { strategies: ['users-permissions'], scope: ['api::note.note.find'] },
              },
            },
          ],
        });
      },
    });
    rq = createRequest({ strapi });
    settings = strapi.plugin('end-users').service('settings');
  });

  describe('the users-permissions strategy', () => {
    it('is named users-permissions and exposes one role of type authenticated', async () => {
      const { token } = await createSignedInUser(rq, 'compat-role@example.com');

      const res = await rq.get('/api/end-users-test/strategy', { headers: bearer(token) });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('users-permissions');
      expect(res.body.role).toMatchObject({ id: expect.any(Number), type: 'authenticated' });
    });

    it('lets a role holding an api:: permission row govern a Content API route', async () => {
      const { token } = await createSignedInUser(rq, 'compat-governed@example.com');

      const refused = await rq.get('/api/end-users-test/governed', { headers: bearer(token) });

      expect(refused.statusCode).toBe(403);

      await setRolePermissions(strapi, 'authenticated', [row('api::note.note.find')]);

      const allowed = await rq.get('/api/end-users-test/governed', { headers: bearer(token) });

      expect(allowed.statusCode).toBe(200);
    });
  });

  beforeEach(resetState);

  afterAll(async () => {
    await resetState();
    await strapi.destroy();
  });

  describe('POST /api/auth/local', () => {
    it('signs in by email or username and returns { jwt, user } with no role', async () => {
      const seeded = await seedUpUser(strapi, { email: 'ann@example.com', username: 'ann' });

      const byEmail = await signIn('Ann@Example.com');
      const byUsername = await signIn('ANN', PASSWORD, { deviceId: 'device-1' });

      for (const res of [byEmail, byUsername]) {
        expect(res.status).toBe(200);
        expect(res.body.jwt).toEqual(expect.any(String));
        expect(res.body.user).toMatchObject({
          id: seeded.id,
          documentId: seeded.documentId,
          email: 'ann@example.com',
          username: 'ann',
          provider: 'local',
          confirmed: true,
          blocked: false,
        });
        expect(res.body.user).not.toHaveProperty('role');
      }
    });

    it('returns a jwt that is not a JWT and works as a Bearer token on a Content API route', async () => {
      await seedUpUser(strapi, { email: 'bea@example.com' });

      const res = await signIn('bea@example.com');

      expect(res.body.jwt.split('.')).not.toHaveLength(3);
      expect(res.body.jwt.startsWith('eyJ')).toBe(false);

      const me = await rq.get('/api/users/me', { headers: bearer(res.body.jwt) });

      expect(me.status).toBe(200);
      expect(me.body.email).toBe('bea@example.com');
    });

    it('answers wrong password, unknown user and a password-less account with the same 400', async () => {
      await seedUpUser(strapi, { email: 'cy@example.com', username: 'cy' });
      await seedUpUser(strapi, { email: 'dee@example.com', credential: false });

      const answers = [
        await signIn('cy@example.com', WRONG),
        await signIn('nobody@example.com'),
        await signIn('dee@example.com'),
        await signIn('cy', WRONG),
        await signIn('nobody'),
        await signIn('nobody@@example', WRONG),
      ];

      for (const res of answers) {
        expect(res.status).toBe(400);
        expect(res.body).toEqual(answers[0].body);
      }

      expect(answers[0].body.error).toMatchObject({ name: 'ApplicationError', message: INVALID });
    });

    it('signs in a username the native username sign-in would refuse', async () => {
      await seedUpUser(strapi, { email: 'jd@example.com', username: 'john-doe' });
      await seedUpUser(strapi, { email: 'jo@example.com', username: 'jo' });

      for (const username of ['john-doe', 'JO']) {
        // eslint-disable-next-line no-await-in-loop
        const res = await signIn(username);

        expect(res.status).toBe(200);
        expect(res.body.jwt).toEqual(expect.any(String));
      }
    });

    it('signs in with a migrated bcrypt hash', async () => {
      await seedUpUser(strapi, { email: 'eve@example.com', hash: 'bcrypt' });

      const res = await signIn('eve@example.com');

      expect(res.status).toBe(200);
      expect(res.body.jwt).toEqual(expect.any(String));
    });

    it('gives unconfirmed and blocked users the users-permissions 400 messages', async () => {
      await settings.set({ signUp: { requireEmailVerification: true } });
      await seedUpUser(strapi, { email: 'fay@example.com', confirmed: false });
      await seedUpUser(strapi, { email: 'gus@example.com', blocked: true });

      const unconfirmed = await signIn('fay@example.com');
      const blocked = await signIn('gus@example.com');

      expect(unconfirmed.status).toBe(400);
      expect(unconfirmed.body.error.message).toBe('Your account email is not confirmed');
      expect(blocked.status).toBe(400);
      expect(blocked.body.error.message).toBe('Your account has been blocked by an administrator');
    });

    it('answers This provider is disabled when the email method is off', async () => {
      await seedUpUser(strapi, { email: 'hal@example.com' });
      await settings.set({ methods: { emailPassword: false } });

      const res = await signIn('hal@example.com');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({
        name: 'ApplicationError',
        message: 'This provider is disabled.',
      });
    });

    it('locks the account after five wrong passwords through /local', async () => {
      await seedUpUser(strapi, { email: 'ivy@example.com' });

      for (let attempt = 0; attempt < 5; attempt += 1) {
        // eslint-disable-next-line no-await-in-loop
        expect((await signIn('ivy@example.com', WRONG)).status).toBe(400);
      }

      const locked = await signIn('ivy@example.com');

      expect(locked.status).toBe(403);
      expect(locked.body.error).toMatchObject({
        status: 403,
        name: 'ForbiddenError',
        details: { code: 'ACCOUNT_LOCKED' },
      });
      expect(locked.body).not.toHaveProperty('jwt');
    });

    it('still signs in with an old over-long password', async () => {
      const long = `Aa1!${'x'.repeat(196)}`;

      await seedUpUser(strapi, { email: 'jon@example.com', password: long });

      const res = await signIn('jon@example.com', long);

      expect(res.status).toBe(200);
      expect(res.body.jwt).toEqual(expect.any(String));
    });

    it('keeps private fields out of the user', async () => {
      await seedUpUser(strapi, { email: 'kim@example.com', username: 'kim' });

      const res = await signIn('kim@example.com');

      expect(Object.keys(res.body.user).sort()).toEqual(
        [
          'blocked',
          'confirmed',
          'createdAt',
          'documentId',
          'email',
          'id',
          'provider',
          'updatedAt',
          'username',
        ].sort()
      );
    });
  });

  describe('POST /api/auth/local/register', () => {
    const body = (email: string, extra: Record<string, unknown> = {}) => ({
      username: email.split('@')[0],
      email,
      password: PASSWORD,
      ...extra,
    });

    it('registers and returns { jwt, user } with the default role and the profile fields', async () => {
      const res = await register(body('Reg@Example.com', { username: 'john-doe' }));

      expect(res.status).toBe(200);
      expect(res.body.jwt).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({
        id: expect.any(Number),
        documentId: expect.any(String),
        email: 'reg@example.com',
        username: 'john-doe',
        provider: 'local',
        confirmed: false,
        blocked: false,
        role: { id: expect.any(Number), type: 'authenticated' },
      });

      // The token works as a Bearer token, and the stored username signs in
      const me = await rq.get('/api/users/me', { headers: bearer(res.body.jwt) });
      const again = await signIn('john-doe');

      expect(me.status).toBe(200);
      expect(again.status).toBe(200);
    });

    it('answers the same 400 for a taken email and a taken username', async () => {
      await seedUpUser(strapi, { email: 'taken@example.com', username: 'taken' });

      const byEmail = await register(body('TAKEN@example.com', { username: 'other' }));
      const byUsername = await register(body('fresh@example.com', { username: 'Taken' }));

      for (const res of [byEmail, byUsername]) {
        expect(res.status).toBe(400);
        expect(res.body.error).toMatchObject({
          name: 'ApplicationError',
          message: 'Email or Username are already taken',
        });
      }

      expect(byUsername.body).toEqual(byEmail.body);
    });

    it('answers Register action is currently disabled when sign-up is off', async () => {
      await settings.set({ signUp: { enabled: false } });

      const res = await register(body('off@example.com'));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({
        name: 'ApplicationError',
        message: 'Register action is currently disabled',
      });
    });

    it('returns { user } and sends the confirmation email when verification is on', async () => {
      await settings.set({ signUp: { requireEmailVerification: true } });
      await strapi.plugin('end-users').service('engine').reload();
      clearSentEmails();

      try {
        const res = await register(body('verify@example.com'));

        expect(res.status).toBe(200);
        expect(res.body).not.toHaveProperty('jwt');
        expect(res.body.user).toMatchObject({ email: 'verify@example.com', confirmed: false });
        expect(sentEmails().map((email) => email.subject)).toContain('Confirm your email address');
      } finally {
        await settings.set({ signUp: { requireEmailVerification: false } });
        await strapi.plugin('end-users').service('engine').reload();
      }
    });

    it('fires entry.create for the new user', async () => {
      created.length = 0;

      const res = await register(body('event@example.com'));

      expect(res.status).toBe(200);
      expect(created).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uid: USER_UID,
            entry: expect.objectContaining({ email: 'event@example.com' }),
          }),
        ])
      );
    });

    it('refuses a weak password', async () => {
      const res = await register(body('weak@example.com', { password: 'short' }));

      expect(res.status).toBe(400);
      expect(res.body.data).toBeNull();
      expect(res.body.error.status).toBe(400);
      expect(await strapi.db.query(USER_UID).count({ where: { email: 'weak@example.com' } })).toBe(
        0
      );
    });

    it('refuses deviceId', async () => {
      const res = await register(body('device@example.com', { deviceId: 'device-1' }));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({
        name: 'ApplicationError',
        message: 'Invalid parameters: deviceId',
      });
      expect(
        await strapi.db.query(USER_UID).count({ where: { email: 'device@example.com' } })
      ).toBe(0);
    });
  });
});

describe('end-users compat: sign-in rate limit', () => {
  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: {
        ...compatConfig(),
        rateLimit: { enabled: true, storage: 'database' },
      },
    });
    rq = createRequest({ strapi });
    settings = strapi.plugin('end-users').service('settings');
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
  });

  afterAll(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await strapi.destroy();
  });

  it('answers the sixth attempt with 429', async () => {
    await seedUpUser(strapi, { email: 'lee@example.com' });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      expect((await signIn('lee@example.com', WRONG)).status).toBe(400);
    }

    expect((await signIn('lee@example.com', WRONG)).status).toBe(429);
  });
});
