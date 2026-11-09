/**
 * The Users & Permissions compatible sign-in, `POST /api/auth/local`, over the whole stack. The
 * file's setup (the instance, the config and the helpers) is at the top; each area has its own
 * `describe`. The rate-limit case needs rate limiting on, so it runs in a second instance after the
 * first one is gone (one instance at a time per file).
 */
import { randomBytes } from 'node:crypto';
import { createRequest } from 'api-tests/request';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import { compatConfig, seedUpUser } from '../utils/compat';
import { createFixtureBuilder } from '../utils/fixtures';
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
    signUp: { enabled: true, requireEmailVerification: false, registrationFields: [] },
  });
};

/** The emails sent so far, once `count` of them have been: they leave after the response. */
const emailsAfter = async (count: number) => {
  const deadline = Date.now() + 3000;

  while (sentEmails().length < count && Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
  }

  return sentEmails();
};

describe('end-users compat: sign-in', () => {
  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: { ...compatConfig(), trustedOrigins: [TEST_ORIGIN] },
      // `api::note.note`, the type the governed route below is granted on
      builder: createFixtureBuilder(),
      // A profile field a registration may carry
      profileAttributes: { company: { type: 'string' } },
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
              // Core needs a scope; this one is let through for any caller of the strategy.
              config: {
                auth: {
                  strategies: ['users-permissions'],
                  scope: ['plugin::end-users.permissions.forCaller'],
                },
              },
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

    it('refuses to register while the email method is off', async () => {
      await settings.set({ methods: { emailPassword: false } });

      const res = await register({
        username: 'offreg',
        email: 'offreg@example.com',
        password: PASSWORD,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({
        name: 'ApplicationError',
        message: 'This provider is disabled.',
      });
      expect(
        await strapi.db.query(USER_UID).count({ where: { email: 'offreg@example.com' } })
      ).toBe(0);
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

      const keys = Object.keys(res.body.user);

      // The profile's readable fields are merged in, so extra keys are allowed
      expect(keys).toEqual(
        expect.arrayContaining([
          'blocked',
          'confirmed',
          'createdAt',
          'documentId',
          'email',
          'id',
          'provider',
          'updatedAt',
          'username',
        ])
      );

      [
        'password',
        'resetPasswordToken',
        'confirmationToken',
        'token',
        'accessToken',
        'refreshToken',
        'banned',
        'emailVerified',
      ].forEach((privateKey) => expect(keys).not.toContain(privateKey));
    });

    it('never shows the carried columns in a user payload', async () => {
      const seeded = await seedUpUser(strapi, {
        email: 'carried@example.com',
        username: 'carried',
      });

      await strapi.db.query(USER_UID).update({
        where: { documentId: seeded.documentId },
        data: {
          password: randomBytes(30).toString('hex'),
          confirmationToken: randomBytes(20).toString('hex'),
          provider: 'github',
        },
      });

      const signedIn = await signIn('carried@example.com');
      const me = await rq.get('/api/users/me', { headers: bearer(signedIn.body.jwt) });

      expect(me.status).toBe(200);

      for (const payload of [signedIn.body.user, me.body]) {
        expect(payload).not.toHaveProperty('password');
        expect(payload).not.toHaveProperty('confirmationToken');
        // `provider` is derived from the account, not read from the carried column
        expect(payload.provider).toBe('local');
      }
    });
  });

  describe('POST /api/auth/local/register', () => {
    const body = (email: string, extra: Record<string, unknown> = {}) => ({
      username: email.split('@')[0],
      email,
      password: PASSWORD,
      ...extra,
    });

    it('registers and returns { jwt, user } with the default role, one profile and a Registration field stored on it', async () => {
      await settings.set({ signUp: { registrationFields: ['company'] } });

      const res = await register(
        body('Reg@Example.com', { username: 'john-doe', company: 'Acme' })
      );

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

      const profiles = await strapi.db
        .query(PROFILE_UID)
        .findMany({ where: { user: { documentId: res.body.user.documentId } } });

      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toMatchObject({ company: 'Acme' });

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
        expect((await emailsAfter(1)).map((email) => email.subject)).toContain(
          'Confirm your email address'
        );
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

  describe('password and email confirmation routes', () => {
    const NEW_PASSWORD = 'N3w-Passw0rd!long';

    /** The first link in the text of an email */
    const linkOf = (email: { text: string }) =>
      new URL(email.text.match(/https?:\/\/\S+/)?.[0] as string);

    const forgot = (body: Record<string, unknown>) =>
      rq.post('/api/auth/forgot-password', { body });

    /** Asks for a reset and reads the code out of the link in the email that was sent */
    const requestCode = async (email: string) => {
      clearSentEmails();

      const res = await forgot({ email });

      expect(res.status).toBe(200);

      return linkOf((await emailsAfter(1))[0]).searchParams.get('code') as string;
    };

    const reset = (body: Record<string, unknown>) => rq.post('/api/auth/reset-password', { body });

    const withVerification = async (run: () => Promise<void>) => {
      await settings.set({ signUp: { requireEmailVerification: true } });
      await strapi.plugin('end-users').service('engine').reload();

      try {
        await run();
      } finally {
        await settings.set({ signUp: { requireEmailVerification: false } });
        await strapi.plugin('end-users').service('engine').reload();
      }
    };

    beforeEach(async () => {
      await settings.set({ redirects: { emailVerified: '/verified', passwordReset: '/reset' } });
    });

    afterEach(async () => {
      await settings.set({ redirects: { emailVerified: null, passwordReset: null } });
    });

    describe('POST /api/auth/forgot-password', () => {
      it('answers { ok: true } for a known and an unknown email and emails a ?code= link', async () => {
        await seedUpUser(strapi, { email: 'forgot@example.com' });
        clearSentEmails();

        const known = await forgot({ email: 'Forgot@Example.com' });
        const unknown = await forgot({ email: 'nobody-here@example.com' });

        expect(known.status).toBe(200);
        expect(known.body).toEqual({ ok: true });
        expect(unknown.status).toBe(200);
        expect(unknown.body).toEqual({ ok: true });

        const emails = await emailsAfter(1);

        expect(emails).toHaveLength(1);
        expect(emails[0].to).toBe('forgot@example.com');

        const link = linkOf(emails[0]);

        expect(link.pathname).toBe('/reset');
        expect(link.searchParams.get('code')).toEqual(expect.any(String));
      });
    });

    describe('POST /api/auth/reset-password', () => {
      it('resets with code, password and passwordConfirmation, returns { jwt, user }, and the old password stops working', async () => {
        const seeded = await seedUpUser(strapi, { email: 'reset@example.com' });
        const code = await requestCode('reset@example.com');

        const res = await reset({
          code,
          password: NEW_PASSWORD,
          passwordConfirmation: NEW_PASSWORD,
        });

        expect(res.status).toBe(200);
        expect(res.body.jwt).toEqual(expect.any(String));
        expect(res.body.user).toMatchObject({ id: seeded.id, email: 'reset@example.com' });

        const me = await rq.get('/api/users/me', { headers: bearer(res.body.jwt) });

        expect(me.status).toBe(200);
        expect((await signIn('reset@example.com', PASSWORD)).status).toBe(400);
        expect((await signIn('reset@example.com', NEW_PASSWORD)).status).toBe(200);
      });

      it('refuses a wrong code and a weak password', async () => {
        await seedUpUser(strapi, { email: 'refuse@example.com' });
        const code = await requestCode('refuse@example.com');

        const wrong = await reset({
          code: 'not-a-code',
          password: NEW_PASSWORD,
          passwordConfirmation: NEW_PASSWORD,
        });
        const mismatch = await reset({
          code,
          password: NEW_PASSWORD,
          passwordConfirmation: `${NEW_PASSWORD}x`,
        });
        const weak = await reset({ code, password: 'short', passwordConfirmation: 'short' });

        expect(wrong.status).toBe(400);
        expect(wrong.body.error).toMatchObject({
          name: 'ApplicationError',
          message: 'Incorrect code provided',
        });
        expect(mismatch.status).toBe(400);
        expect(mismatch.body.error.message).toBe('Passwords do not match');
        expect(weak.status).toBe(400);
        expect(weak.body.error).toMatchObject({ details: { code: 'PASSWORD_TOO_WEAK' } });

        // The code was not used up by the refusals
        const ok = await reset({
          code,
          password: NEW_PASSWORD,
          passwordConfirmation: NEW_PASSWORD,
        });

        expect(ok.status).toBe(200);
      });

      it('ends the sessions that existed before the reset: the old token answers 401, the new jwt 200', async () => {
        await seedUpUser(strapi, { email: 'revoked@example.com' });

        const { jwt: oldToken } = (await signIn('revoked@example.com')).body;
        const before = await rq.get('/api/users/me', { headers: bearer(oldToken) });
        const code = await requestCode('revoked@example.com');
        const res = await reset({
          code,
          password: NEW_PASSWORD,
          passwordConfirmation: NEW_PASSWORD,
        });

        expect(before.status).toBe(200);
        expect(res.status).toBe(200);
        expect((await rq.get('/api/users/me', { headers: bearer(oldToken) })).status).toBe(401);
        expect((await rq.get('/api/users/me', { headers: bearer(res.body.jwt) })).status).toBe(200);
      });

      it('a native client posting token and newPassword to /reset-password still works', async () => {
        await seedUpUser(strapi, { email: 'native@example.com' });
        const token = await requestCode('native@example.com');

        const res = await reset({ token, newPassword: NEW_PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: true });
        expect((await signIn('native@example.com', NEW_PASSWORD)).status).toBe(200);
      });
    });

    describe('POST /api/auth/change-password', () => {
      it('changes the password, returns a new jwt and the old session token stops working', async () => {
        await seedUpUser(strapi, { email: 'change@example.com' });

        const { jwt: oldToken } = (await signIn('change@example.com')).body;

        const res = await rq.post('/api/auth/change-password', {
          headers: bearer(oldToken),
          body: {
            currentPassword: PASSWORD,
            password: NEW_PASSWORD,
            passwordConfirmation: NEW_PASSWORD,
          },
        });

        expect(res.status).toBe(200);
        expect(res.body.jwt).toEqual(expect.any(String));
        expect(res.body.jwt).not.toBe(oldToken);
        expect(res.body.user).toMatchObject({ email: 'change@example.com' });

        const stale = await rq.get('/api/users/me', { headers: bearer(oldToken) });
        const fresh = await rq.get('/api/users/me', { headers: bearer(res.body.jwt) });

        expect(stale.status).toBe(401);
        expect(fresh.status).toBe(200);
        expect((await signIn('change@example.com', PASSWORD)).status).toBe(400);
        expect((await signIn('change@example.com', NEW_PASSWORD)).status).toBe(200);
      });
    });

    describe('email confirmation', () => {
      it('confirms by the ?confirmation= link, redirects to the configured URL, and answers 400 Invalid token for a bad one', async () => {
        await withVerification(async () => {
          clearSentEmails();

          const registered = await register({
            username: 'confirm',
            email: 'confirm@example.com',
            password: PASSWORD,
          });

          expect(registered.status).toBe(200);

          const link = linkOf((await emailsAfter(1))[0]);
          const followed = await rq.get(`${link.pathname}${link.search}`);

          expect(followed.status).toBe(302);
          expect(followed.headers.location).toBe('/verified');
          expect(
            await strapi.db
              .query(USER_UID)
              .count({ where: { email: 'confirm@example.com', emailVerified: true } })
          ).toBe(1);

          const bad = await rq.get('/api/auth/email-confirmation?confirmation=not-a-token');

          expect(bad.status).toBe(400);
          expect(bad.body.error).toMatchObject({
            name: 'ApplicationError',
            message: 'Invalid token',
          });
        });
      });

      it('confirms an old ?confirmation= link once and redirects, and answers 400 the second time', async () => {
        // The token users-permissions would have mailed: 40 hex characters, carried in its column
        const token = randomBytes(20).toString('hex');
        const seeded = await seedUpUser(strapi, {
          email: 'old-link@example.com',
          confirmed: false,
        });

        await strapi.db.query(USER_UID).update({
          where: { documentId: seeded.documentId },
          data: { confirmationToken: token },
        });

        const first = await rq.get(`/api/auth/email-confirmation?confirmation=${token}`);

        expect(first.status).toBe(302);
        expect(first.headers.location).toBe('/verified');

        const stored = await strapi.db.query(USER_UID).findOne({
          where: { documentId: seeded.documentId },
        });

        expect(stored).toMatchObject({ emailVerified: true, confirmationToken: null });

        const second = await rq.get(`/api/auth/email-confirmation?confirmation=${token}`);

        expect(second.status).toBe(400);
        expect(second.body.error).toMatchObject({
          name: 'ApplicationError',
          message: 'Invalid token',
        });
      });

      it('send-email-confirmation answers { email, sent: true } for an unknown address too', async () => {
        await withVerification(async () => {
          await seedUpUser(strapi, { email: 'again@example.com', confirmed: false });
          clearSentEmails();

          const known = await rq.post('/api/auth/send-email-confirmation', {
            body: { email: 'Again@Example.com' },
          });
          const unknown = await rq.post('/api/auth/send-email-confirmation', {
            body: { email: 'nobody-here@example.com' },
          });

          expect(known.status).toBe(200);
          expect(known.body).toEqual({ email: 'again@example.com', sent: true });
          expect(unknown.status).toBe(200);
          expect(unknown.body).toEqual({ email: 'nobody-here@example.com', sent: true });
          expect((await emailsAfter(1)).map((email) => email.to)).toEqual(['again@example.com']);
        });
      });

      it('a verification email carries a ?confirmation= link', async () => {
        await withVerification(async () => {
          clearSentEmails();

          await register({
            username: 'linked',
            email: 'linked@example.com',
            password: PASSWORD,
          });

          const [sent] = await emailsAfter(1);
          const link = linkOf(sent);

          expect(sent.subject).toBe('Confirm your email address');
          expect(link.pathname).toBe('/api/auth/email-confirmation');
          expect(link.searchParams.get('confirmation')).toEqual(expect.any(String));
        });
      });
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

    const limited = await signIn('lee@example.com', WRONG);

    expect(limited.status).toBe(429);
    // The envelope the old plugin answered with, not Better Auth's own body
    expect(limited.body).toEqual({
      data: null,
      error: {
        status: 429,
        name: 'RateLimitError',
        message: expect.any(String),
        details: {},
      },
    });
  });
});
