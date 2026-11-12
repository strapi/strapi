/**
 * Every must-keep behavior of the compatibility mode, on a database that was migrated from Users &
 * Permissions rather than made fresh: one API case for each row, over the whole stack. The project is
 * seeded once with the old plugin, migrated once, and the cases then talk to the result as an old
 * front end would. The ones that change a user use a user of their own, so most cases do not depend on
 * the order they run in. Some do: rows 3 and 11 share a memo count, so they stay in the order written.
 */
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { createRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

import { clearSentEmails, sentEmails } from '../utils/email-capture-provider';
import { startFakeOidc } from '../utils/fake-oidc';
import type { FakeOidc } from '../utils/fake-oidc';
import { TEST_PASSWORD, bearer } from '../utils/permissions';
import { resetDatabase } from '../utils/reset-database';
import {
  migratedInstance,
  removeProjectTypes,
  seedUsersPermissionsProject,
} from '../utils/users-permissions-project';
import type { UsersPermissionsProject } from '../utils/users-permissions-project';

const ORIGIN = 'https://app.example.test';
const FIXTURE_PACKAGE = path.join(__dirname, '..', 'fixtures', 'provider-package');
const PROVIDER = 'fixture-idp';
const USER_UID = 'plugin::end-users.user';
const ACCOUNT_UID = 'plugin::end-users.account';
const WRONG = 'not-the-password';
const NEW_PASSWORD = 'N3w-Passw0rd!long';

type Res = Awaited<ReturnType<ReturnType<typeof createRequest>['get']>>;

/** The cookies of a response, as a client sends them back */
const cookiesOf = (res: Res) =>
  ((res.headers['set-cookie'] ?? []) as unknown as string[])
    .map((cookie) => cookie.split(';')[0])
    .join('; ');

/** The emails sent so far, once `count` of them have been: they leave after the response */
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

describe('end-users compat: every must-keep behavior on a migrated database', () => {
  let project: UsersPermissionsProject;
  let strapi: Core.Strapi;
  let oidc: FakeOidc;
  let rq: ReturnType<typeof createRequest>;

  const alice = () => project.users.alice;

  const signIn = (identifier: string, password: string = TEST_PASSWORD) =>
    rq.post('/api/auth/local', { body: { identifier, password } });

  const gql = (query: string, variables: Record<string, unknown> = {}) =>
    rq.post('/graphql', { body: { query, variables } });

  /** A token for alice, who is only ever read in these cases */
  const aliceToken = async () => (await signIn('alice')).body.jwt as string;

  beforeAll(async () => {
    oidc = await startFakeOidc();
    project = await seedUsersPermissionsProject({ refresh: true });
    strapi = await migratedInstance(project, {
      instance: {
        fakeOidc: oidc,
        pluginConfig: {
          providers: [
            {
              provider: FIXTURE_PACKAGE,
              options: {
                clientId: 'fake-client',
                clientSecret: 'fake-client-secret-value',
                issuer: oidc.issuer,
              },
            },
          ],
        },
        // A route pinned to the old strategy name, which echoes what the strategy put on the context
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
                config: {
                  auth: {
                    strategies: ['users-permissions'],
                    scope: ['plugin::end-users.permissions.forCaller'],
                  },
                },
              },
            ],
          });
        },
      },
    });
    rq = createRequest({ strapi });
  });

  afterAll(async () => {
    await strapi?.destroy();
    await oidc?.stop();
    removeProjectTypes();
    await resetDatabase();
  });

  it('signs a migrated user in by email and by username with the old password', async () => {
    const byEmail = await signIn('Alice@Example.com');
    const byUsername = await signIn('Alice');

    for (const res of [byEmail, byUsername]) {
      expect(res.status).toBe(200);
      expect(res.body.jwt).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({
        id: alice().id,
        documentId: alice().documentId,
        email: 'alice@example.com',
      });
    }
  });

  it('registers a new user next to the migrated ones, with the migrated default role', async () => {
    const res = await rq.post('/api/auth/local/register', {
      body: { username: 'newbie', email: 'newbie@example.com', password: TEST_PASSWORD },
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'newbie@example.com', username: 'newbie' });

    const stored = (await strapi.db.query(USER_UID).findOne({
      where: { email: 'newbie@example.com' },
      populate: ['roles'],
    })) as { roles: Array<{ documentId: string }> };

    expect(stored.roles.map((role) => role.documentId)).toEqual([
      project.roles.authenticated.documentId,
    ]);
  });

  it('accepts the jwt of a migrated user as a Bearer token on a Content API route', async () => {
    const res = await rq.get('/api/memos', { headers: bearer(await aliceToken()) });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ title: 'Welcome' })]);
  });

  it('keeps the stored hash: the old password signs in and a wrong one does not', async () => {
    const hashOf = async () =>
      (
        await strapi.db
          .connection('eu_accounts')
          .where({ provider_id: 'credential', user_id: alice().documentId })
          .first()
      ).password as string;

    const before = await hashOf();

    expect(before).toMatch(/^\$2[aby]\$/);
    expect((await signIn('alice@example.com')).status).toBe(200);
    expect((await signIn('alice@example.com', WRONG)).status).toBe(400);
    // Signing in did not rewrite it
    expect(await hashOf()).toBe(before);
  });

  it('names the strategy users-permissions and gives a migrated user their migrated role', async () => {
    const res = await rq.get('/api/end-users-test/strategy', {
      headers: bearer(await aliceToken()),
    });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('users-permissions');
    expect(res.body.role).toMatchObject({
      id: project.roles.authenticated.id,
      type: 'authenticated',
    });
  });

  it('resolves an app relation that pointed at a user before the migration', async () => {
    const res = await rq.get('/api/memos?populate=author', {
      headers: bearer(await aliceToken()),
    });

    expect(res.status).toBe(200);
    expect(res.body.data[0].author).toMatchObject({
      id: alice().id,
      documentId: alice().documentId,
    });
  });

  it('keeps numeric ids and documentIds, and derives confirmed, provider and the caller`s own blocked from the migrated data', async () => {
    const res = await rq.get('/api/users', { headers: bearer(await aliceToken()) });

    expect(res.status).toBe(200);

    const byId = (id: number) => res.body.find((user) => user.id === id);
    const { users } = project;

    expect(byId(users.alice.id)).toMatchObject({
      documentId: users.alice.documentId,
      confirmed: true,
      blocked: false,
      provider: 'local',
    });
    expect(byId(users.bob.id)).toMatchObject({
      documentId: users.bob.documentId,
      confirmed: false,
    });
    expect(byId(users.carol.id)).toMatchObject({
      documentId: users.carol.documentId,
      confirmed: true,
      provider: 'github',
    });
    expect(byId(users.dave.id)).toMatchObject({ documentId: users.dave.documentId });

    // `blocked` follows the caller's right to read `banned`: their own record shows it, and
    // another user's does not unless their role lists the field
    expect(byId(users.bob.id)).not.toHaveProperty('blocked');
    expect(byId(users.dave.id)).not.toHaveProperty('blocked');
  });

  it('merges the migrated custom fields into the user and writes them to the profile', async () => {
    const headers = bearer(await aliceToken());
    const me = await rq.get('/api/users/me', { headers });

    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ id: alice().id, company: 'Acme' });

    const updated = await rq.put(`/api/users/${alice().id}`, {
      headers,
      body: { company: 'Acme Two' },
    });

    expect(updated.status).toBe(200);
    expect(updated.body.company).toBe('Acme Two');

    const profile = await strapi.db.connection('eu_profiles').where({ id: alice().id }).first();

    expect(profile.company).toBe('Acme Two');

    await rq.put(`/api/users/${alice().id}`, { headers, body: { company: 'Acme' } });
  });

  it('lets a role that could update users edit its own profile and refuses one that could not', async () => {
    const allowed = await rq.put('/api/users/me/profile', {
      headers: bearer(await aliceToken()),
      body: { data: { company: 'Acme' } },
    });

    expect(allowed.status).toBe(200);

    // The editors role never held the user update in Users & Permissions. Erin is in every seed
    // (the upper-case twin is not, on MySQL), so she is moved to that role for the request
    const erin = project.users.erin;
    const asEditor = (roleId: number) =>
      strapi.db
        .connection('eu_users_roles_lnk')
        .where({ user_id: erin.id })
        .update({ role_id: roleId });

    await asEditor(project.roles.editors.id);

    try {
      const editor = await signIn(erin.email);

      expect(editor.status).toBe(200);

      const refused = await rq.put('/api/users/me/profile', {
        headers: bearer(editor.body.jwt as string),
        body: { data: { company: 'Elsewhere' } },
      });

      expect(refused.status).toBe(403);
    } finally {
      await asEditor(project.roles.authenticated.id);
    }
  });

  it('shows the migrated role with its old id on /users/me?populate=role', async () => {
    const res = await rq.get('/api/users/me?populate=role', {
      headers: bearer(await aliceToken()),
    });

    expect(res.status).toBe(200);
    expect(res.body.role).toEqual({
      id: project.roles.authenticated.id,
      name: 'Authenticated',
      description: expect.any(String),
      type: 'authenticated',
    });
  });

  it('lets a migrated api:: permission govern a route and refuses one that was not granted', async () => {
    const headers = bearer(await aliceToken());
    const created = await rq.post('/api/memos', { headers, body: { data: { title: 'Mine' } } });

    expect(created.status).toBe(201);

    const refused = await rq.delete(`/api/memos/${created.body.data.documentId}`, { headers });

    expect(refused.status).toBe(403);
  });

  it('answers 401 for a bad token and accepts a legacy token issued before the cutover', async () => {
    const bad = await rq.get('/api/users/me', { headers: bearer('not.a.token') });

    expect(bad.status).toBe(401);

    const legacy = await rq.get('/api/users/me', {
      headers: bearer(project.oldTokens.legacyJwt),
    });

    expect(legacy.status).toBe(200);
    expect(legacy.body).toMatchObject({ id: alice().id });
  });

  it('refuses the migrated blocked and unconfirmed users with the users-permissions messages', async () => {
    const blocked = await signIn('dave');
    const unconfirmed = await signIn('bob@example.com');

    expect(blocked.status).toBe(400);
    expect(blocked.body.error.message).toBe('Your account has been blocked by an administrator');
    expect(unconfirmed.status).toBe(400);
    expect(unconfirmed.body.error.message).toBe('Your account email is not confirmed');
  });

  it('keeps the migrated sign-up and redirect settings', async () => {
    const { signUp, redirects } = await strapi.plugin('end-users').service('settings').get();

    expect(signUp).toMatchObject({ enabled: true, requireEmailVerification: true });
    expect(redirects).toMatchObject({
      emailVerified: `${ORIGIN}/confirmed`,
      passwordReset: `${ORIGIN}/reset`,
    });

    // Sign-up is on and verification is required, so there is no token until the address is confirmed
    const res = await rq.post('/api/auth/local/register', {
      body: { username: 'settled', email: 'settled@example.com', password: TEST_PASSWORD },
    });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('jwt');
    expect(res.body.user).toMatchObject({ email: 'settled@example.com', confirmed: false });
  });

  it('sends a reset link to the migrated reset URL and resets the password', async () => {
    const erin = project.users.erin;

    clearSentEmails();

    const asked = await rq.post('/api/auth/forgot-password', { body: { email: erin.email } });

    expect(asked.status).toBe(200);

    const [email] = await emailsAfter(1);
    const link = new URL((email.html ?? email.text).match(/https?:\/\/[^\s<"]+/)?.[0] as string);

    expect(`${link.origin}${link.pathname}`).toBe(`${ORIGIN}/reset`);

    const reset = await rq.post('/api/auth/reset-password', {
      body: {
        code: link.searchParams.get('code'),
        password: NEW_PASSWORD,
        passwordConfirmation: NEW_PASSWORD,
      },
    });

    expect(reset.status).toBe(200);
    expect(reset.body.user).toMatchObject({ id: erin.id });
    expect((await signIn('erin', TEST_PASSWORD)).status).toBe(400);
    expect((await signIn('erin', NEW_PASSWORD)).status).toBe(200);
  });

  it('confirms a confirmation link sent before the migration, once', async () => {
    const link = `/api/auth/email-confirmation?confirmation=${project.confirmationToken}`;
    const first = await rq.get(link);

    expect(first.status).toBe(302);
    expect(first.headers.location).toBe(`${ORIGIN}/confirmed`);
    expect((await signIn('bob@example.com')).status).toBe(200);

    const second = await rq.get(link);

    expect(second.status).toBe(400);
    expect(second.body.error.message).toBe('Invalid token');
  });

  it("changes a migrated user's password and keeps the old column in step", async () => {
    const frank = project.users.frank;
    const { jwt } = (await signIn(frank.email)).body;

    const changed = await rq.post('/api/auth/change-password', {
      headers: bearer(jwt),
      body: {
        currentPassword: TEST_PASSWORD,
        password: NEW_PASSWORD,
        passwordConfirmation: NEW_PASSWORD,
      },
    });

    expect(changed.status).toBe(200);
    expect(changed.body.jwt).toEqual(expect.any(String));
    expect((await signIn(frank.email, TEST_PASSWORD)).status).toBe(400);
    expect((await signIn(frank.email, NEW_PASSWORD)).status).toBe(200);

    const row = await strapi.db.connection('eu_users').where({ id: frank.id }).first();

    expect(bcrypt.compareSync(NEW_PASSWORD, row.password)).toBe(true);
  });

  it('starts the GitHub flow with the migrated client id and the old callback address', async () => {
    const res = await rq.get('/api/connect/github');

    expect(res.status).toBe(302);

    const location = new URL(res.headers.location as string);

    expect(location.origin).toBe('https://github.com');
    expect(location.searchParams.get('client_id')).toBe('gh-client');
    expect(location.searchParams.get('redirect_uri')).toMatch(/\/api\/connect\/github\/callback$/);
  });

  it('links a provider user from before the migration on their first sign-in and exchanges the session once', async () => {
    const carol = project.users.carol;

    oidc.reset();
    oidc.user = {
      sub: 'carol-at-the-provider',
      email: carol.email,
      name: 'Carol',
      email_verified: true,
    };

    const start = await rq.get(
      `/api/connect/${PROVIDER}?callback=${encodeURIComponent(`${ORIGIN}/connected`)}`
    );

    expect(start.status).toBe(302);

    const authorize = await fetch(start.headers.location as string, { redirect: 'manual' });
    const returned = new URL(authorize.headers.get('location') as string);
    const callback = await rq.get(`${returned.pathname}${returned.search}`, {
      headers: { cookie: cookiesOf(start) },
    });

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe(`${ORIGIN}/connected`);

    const headers = { cookie: cookiesOf(callback) };
    const exchanged = await rq.get(`/api/auth/${PROVIDER}/callback`, { headers });

    expect(exchanged.status).toBe(200);
    expect(exchanged.body.user).toMatchObject({ id: carol.id, documentId: carol.documentId });

    // The sign-in joined the user from before the migration instead of making another
    expect(await strapi.db.query(USER_UID).count({ where: { email: carol.email } })).toBe(1);
    expect(
      await strapi.db
        .query(ACCOUNT_UID)
        .count({ where: { providerId: PROVIDER, userId: carol.documentId } })
    ).toBe(1);

    const again = await rq.get(`/api/auth/${PROVIDER}/callback`, { headers });

    expect(again.status).toBe(400);
  });

  it('exchanges a refresh token issued before the migration and rotates it', async () => {
    const old = project.oldTokens.refreshToken as string;
    const res = await rq.post('/api/auth/refresh', { body: { refreshToken: old } });

    expect(res.status).toBe(200);
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).not.toBe(old);
    expect(res.body.user ?? {}).not.toHaveProperty('password');
    expect((await rq.get('/api/users/me', { headers: bearer(res.body.jwt) })).status).toBe(200);

    // The old one is spent
    expect((await rq.post('/api/auth/refresh', { body: { refreshToken: old } })).status).toBe(401);
  });

  it('locks a migrated account after five wrong passwords', async () => {
    const identifier = project.users.aliceDuplicate.username;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      expect((await signIn(identifier, WRONG)).status).toBe(400);
    }

    const locked = await signIn(identifier);

    expect(locked.status).toBe(403);
    expect(locked.body.error).toMatchObject({ details: { code: 'ACCOUNT_LOCKED' } });
    expect(locked.body).not.toHaveProperty('jwt');
  });

  it('never shows the carried users-permissions columns in a user payload', async () => {
    const signed = await signIn('alice');
    const me = await rq.get('/api/users/me', { headers: bearer(signed.body.jwt) });
    const list = await rq.get('/api/users', { headers: bearer(signed.body.jwt) });

    // The migration carried the columns: they are in the table, and out of every payload
    const row = await strapi.db.connection('eu_users').where({ id: alice().id }).first();

    expect(row.password).toMatch(/^\$2[aby]\$/);

    for (const payload of [signed.body.user, me.body, ...list.body]) {
      for (const hidden of ['password', 'confirmationToken', 'resetPasswordToken']) {
        expect(payload).not.toHaveProperty(hidden);
      }
    }
  });

  it('signs a migrated user in through the GraphQL login', async () => {
    const res = await gql(
      `mutation ($identifier: String!, $password: String!) {
        login(input: { identifier: $identifier, password: $password }) {
          jwt
          user { id documentId email username confirmed blocked company }
        }
      }`,
      { identifier: 'alice', password: TEST_PASSWORD }
    );

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.login.jwt).toEqual(expect.any(String));
    expect(res.body.data.login.user).toMatchObject({
      id: String(alice().id),
      documentId: alice().documentId,
      email: 'alice@example.com',
      confirmed: true,
      blocked: false,
      company: 'Acme',
    });
  });
});
