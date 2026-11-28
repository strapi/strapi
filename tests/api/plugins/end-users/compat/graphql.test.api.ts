/**
 * The Users & Permissions GraphQL schema over the whole stack, while the compatibility mode is on:
 * its type names, its `login`, `register`, `forgotPassword`, `resetPassword`, `changePassword` and
 * `emailConfirmation` mutations and `me`, all of them going through the compat routes. The rate-limit
 * case needs rate limiting on, so it runs in a second instance after the first one is gone.
 */
import { randomBytes } from 'node:crypto';
import { createRequest } from 'api-tests/request';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import { compatConfig, seedUpUser } from '../utils/compat';
import { clearSentEmails } from '../utils/email-capture-provider';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  TEST_PASSWORD as PASSWORD,
  bearer,
  emptyTables,
  resetRoles,
  setRolePermissions,
  unconditioned,
} from '../utils/permissions';
import { emailsAfter } from '../utils/wait';
import { DEFAULT_AUTHENTICATED_PERMISSIONS } from '../../../../../packages/plugins/end-users/server/src/bootstrap';

const USER_UID = 'plugin::end-users.user';
const WRONG = 'not-the-password';
const NEW_PASSWORD = 'N3w-Passw0rd!long';

let strapi;
let rq;

const gql = (query: string, variables: Record<string, unknown> = {}, headers = {}) =>
  rq.post('/graphql', { body: { query, variables }, headers });

const LOGIN = `mutation ($identifier: String!, $password: String!) {
  login(input: { identifier: $identifier, password: $password }) {
    jwt
    user { id documentId email username confirmed blocked company role { name } }
  }
}`;

const signIn = (identifier: string, password: string = PASSWORD) =>
  gql(LOGIN, { identifier, password });

const linkOf = (email: { text: string }) =>
  new URL(email.text.match(/https?:\/\/\S+/)?.[0] as string);

describe('end-users compat: GraphQL', () => {
  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: { ...compatConfig(), trustedOrigins: [TEST_ORIGIN] },
      profileAttributes: { company: { type: 'string' } },
    });
    rq = createRequest({ strapi });
    await strapi
      .plugin('end-users')
      .service('settings')
      .set({
        methods: { emailPassword: true, username: true },
        signUp: { enabled: true, requireEmailVerification: false, registrationFields: [] },
        redirects: { emailVerified: '/verified', passwordReset: '/reset' },
      });
  });

  beforeEach(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await resetRoles(strapi);
    clearSentEmails();
  });

  afterAll(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await resetRoles(strapi);
    await strapi.destroy();
  });

  it('login returns { jwt, user } with the profile fields and the same errors as /local', async () => {
    const seeded = await seedUpUser(strapi, {
      email: 'gql-login@example.com',
      username: 'gqllogin',
    });

    await strapi.db.query(PROFILE_UID).updateMany({
      where: { user: { documentId: seeded.documentId } },
      data: { company: 'Acme' },
    });

    const res = await signIn('gql-login@example.com');

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.login.jwt).toEqual(expect.any(String));
    expect(res.body.data.login.user).toMatchObject({
      id: String(seeded.id),
      documentId: seeded.documentId,
      email: 'gql-login@example.com',
      username: 'gqllogin',
      confirmed: true,
      blocked: false,
    });

    const wrong = await signIn('gql-login@example.com', WRONG);
    const rest = await rq.post('/api/auth/local', {
      body: { identifier: 'gql-login@example.com', password: WRONG },
    });

    expect(wrong.body.data).toBeNull();
    expect(wrong.body.errors[0].message).toBe(rest.body.error.message);
  });

  it('register, forgotPassword, resetPassword, changePassword and emailConfirmation work', async () => {
    const registered = await gql(
      `mutation ($input: UsersPermissionsRegisterInput!) {
        register(input: $input) { jwt user { email username } }
      }`,
      { input: { username: 'gqlreg', email: 'gql-reg@example.com', password: PASSWORD } }
    );

    expect(registered.body.errors).toBeUndefined();
    expect(registered.body.data.register.user).toEqual({
      email: 'gql-reg@example.com',
      username: 'gqlreg',
    });
    expect(registered.body.data.register.jwt).toEqual(expect.any(String));

    // forgotPassword, then resetPassword with the code from the email
    clearSentEmails();

    const forgot = await gql(
      'mutation ($email: String!) { forgotPassword(email: $email) { ok } }',
      { email: 'gql-reg@example.com' }
    );

    expect(forgot.body.data.forgotPassword).toEqual({ ok: true });

    const code = linkOf((await emailsAfter(1))[0]).searchParams.get('code');
    const reset = await gql(
      `mutation ($code: String!, $password: String!) {
        resetPassword(code: $code, password: $password, passwordConfirmation: $password) {
          jwt user { email }
        }
      }`,
      { code, password: NEW_PASSWORD }
    );

    expect(reset.body.errors).toBeUndefined();
    expect(reset.body.data.resetPassword.user.email).toBe('gql-reg@example.com');

    // changePassword needs the caller
    const change = await gql(
      `mutation ($current: String!, $password: String!) {
        changePassword(currentPassword: $current, password: $password, passwordConfirmation: $password) {
          jwt user { email }
        }
      }`,
      { current: NEW_PASSWORD, password: PASSWORD },
      bearer(reset.body.data.resetPassword.jwt)
    );

    expect(change.body.errors).toBeUndefined();
    expect(change.body.data.changePassword.jwt).toEqual(expect.any(String));
    expect((await signIn('gql-reg@example.com')).body.data.login.jwt).toEqual(expect.any(String));

    const anonymous = await gql(
      `mutation { changePassword(currentPassword: "a", password: "b", passwordConfirmation: "b") { jwt } }`
    );

    expect(anonymous.body.errors[0].message).toBe('Forbidden access');
  });

  it('emailConfirmation signs the user in once, and the same token gives no jwt the second time', async () => {
    const settings = strapi.plugin('end-users').service('settings');
    const engines = strapi.plugin('end-users').service('engine');

    await settings.set({ signUp: { requireEmailVerification: true } });
    await engines.reload();

    try {
      const registered = await gql(
        `mutation { register(input: { username: "gqlconf", email: "gql-conf@example.com", password: "${PASSWORD}" }) { jwt user { confirmed } } }`
      );

      expect(registered.body.data.register.jwt).toBeNull();
      expect(registered.body.data.register.user.confirmed).toBe(false);

      const token = linkOf((await emailsAfter(1))[0]).searchParams.get('confirmation');
      const confirm = `mutation ($token: String!) {
        emailConfirmation(confirmation: $token) { jwt user { email confirmed } }
      }`;

      const first = await gql(confirm, { token });

      expect(first.body.errors).toBeUndefined();
      expect(first.body.data.emailConfirmation.jwt).toEqual(expect.any(String));
      expect(first.body.data.emailConfirmation.user).toEqual({
        email: 'gql-conf@example.com',
        confirmed: true,
      });

      const second = await gql(confirm, { token });

      expect(second.body.data.emailConfirmation).toBeNull();
      expect(second.body.errors[0].message).toBe('Invalid token');
    } finally {
      await settings.set({ signUp: { requireEmailVerification: false } });
      await engines.reload();
    }
  });

  it('emailConfirmation with an old token signs the user in once', async () => {
    const token = randomBytes(20).toString('hex');
    const seeded = await seedUpUser(strapi, { email: 'gql-old@example.com', confirmed: false });

    await strapi.db.query(USER_UID).update({
      where: { documentId: seeded.documentId },
      data: { confirmationToken: token },
    });

    const confirm = `mutation ($token: String!) {
      emailConfirmation(confirmation: $token) { jwt user { email confirmed } }
    }`;

    const first = await gql(confirm, { token });

    expect(first.body.errors).toBeUndefined();
    expect(first.body.data.emailConfirmation.jwt).toEqual(expect.any(String));
    expect(first.body.data.emailConfirmation.user).toEqual({
      email: 'gql-old@example.com',
      confirmed: true,
    });

    const second = await gql(confirm, { token });

    expect(second.body.data.emailConfirmation).toBeNull();
    expect(second.body.errors[0].message).toBe('Invalid token');
  });

  it('emailConfirmation signs in exactly one of several calls that use the same token at once', async () => {
    const settings = strapi.plugin('end-users').service('settings');
    const engines = strapi.plugin('end-users').service('engine');

    await settings.set({ signUp: { requireEmailVerification: true } });
    await engines.reload();

    try {
      await gql(
        `mutation { register(input: { username: "gqlrace", email: "gql-race@example.com", password: "${PASSWORD}" }) { jwt } }`
      );

      const token = linkOf((await emailsAfter(1))[0]).searchParams.get('confirmation');
      const confirm = `mutation ($token: String!) { emailConfirmation(confirmation: $token) { jwt } }`;
      const answers = await Promise.all(Array.from({ length: 4 }, () => gql(confirm, { token })));

      expect(answers.filter((answer) => answer.body.data?.emailConfirmation?.jwt)).toHaveLength(1);
    } finally {
      await settings.set({ signUp: { requireEmailVerification: false } });
      await engines.reload();
    }
  });

  it('refuses login, register, resetPassword and changePassword while email and password sign-in is off', async () => {
    const settings = strapi.plugin('end-users').service('settings');
    const user = await seedUpUser(strapi, { email: 'gql-off@example.com', username: 'gqloff' });

    await settings.set({ methods: { emailPassword: false, username: true } });

    try {
      const login = await signIn('gql-off@example.com');
      const registered = await gql(
        `mutation ($input: UsersPermissionsRegisterInput!) {
          register(input: $input) { jwt }
        }`,
        { input: { username: 'gqlnew', email: 'gql-new@example.com', password: PASSWORD } }
      );
      const reset = await gql(
        `mutation { resetPassword(code: "x", password: "${NEW_PASSWORD}", passwordConfirmation: "${NEW_PASSWORD}") { jwt } }`
      );
      const change = await gql(
        `mutation { changePassword(currentPassword: "${PASSWORD}", password: "${NEW_PASSWORD}", passwordConfirmation: "${NEW_PASSWORD}") { jwt } }`,
        {},
        bearer(
          (
            await strapi
              .plugin('end-users')
              .service('engine')
              .get()
              .createSession(user.documentId, {})
          ).token
        )
      );

      for (const answer of [login, registered, reset, change]) {
        expect(answer.body.errors).toHaveLength(1);
        expect(answer.body.errors[0].message).toMatch(/disabled|Not Found/);
      }

      // The same refusal over REST
      const rest = await rq.post('/api/auth/reset-password', {
        body: { code: 'x', password: NEW_PASSWORD, passwordConfirmation: NEW_PASSWORD },
      });

      expect(rest.status).toBe(404);

      // No account was made by the refused registrations, over GraphQL or REST
      const restRegistered = await rq.post('/api/auth/local/register', {
        body: { username: 'restnew', email: 'rest-new@example.com', password: PASSWORD },
      });

      expect(restRegistered.status).toBe(400);
      expect(
        await strapi.db
          .query(USER_UID)
          .count({ where: { email: { $in: ['gql-new@example.com', 'rest-new@example.com'] } } })
      ).toBe(0);
    } finally {
      await settings.set({ methods: { emailPassword: true, username: true } });
    }
  });

  it('me returns the user with its role, and errors without a caller', async () => {
    await seedUpUser(strapi, { email: 'gql-me@example.com' });

    const { jwt } = (await signIn('gql-me@example.com')).body.data.login;
    const query = '{ me { id email confirmed blocked role { name type } } }';

    const res = await gql(query, {}, bearer(jwt));

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.me).toMatchObject({
      email: 'gql-me@example.com',
      confirmed: true,
      blocked: false,
      role: { type: 'authenticated' },
    });

    const anonymous = await gql(query);

    expect(anonymous.body.data.me).toBeNull();
    expect(anonymous.body.errors[0].message).toBe('Forbidden access');
  });

  it('a locked account is refused through login, as it is through /local', async () => {
    await seedUpUser(strapi, { email: 'gql-lock@example.com' });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      await signIn('gql-lock@example.com', WRONG);
    }

    const locked = await signIn('gql-lock@example.com');
    const rest = await rq.post('/api/auth/local', {
      body: { identifier: 'gql-lock@example.com', password: PASSWORD },
    });

    expect(rest.status).toBe(403);
    expect(locked.body.data).toBeNull();
    expect(locked.body.errors[0].message).toBe(rest.body.error.message);
  });

  it('creates, updates and deletes a user under the UsersPermissions names with the end-users scopes', async () => {
    await seedUpUser(strapi, { email: 'gql-crud@example.com' });

    const { jwt } = (await signIn('gql-crud@example.com')).body.data.login;
    const create = `mutation { createUsersPermissionsUser(data: { email: "made@example.com", name: "made" }) { documentId email } }`;

    // Without a grant it is refused
    expect((await gql(create, {}, bearer(jwt))).body.errors[0].message).toBe('Forbidden access');

    await setRolePermissions(strapi, 'authenticated', [
      ...DEFAULT_AUTHENTICATED_PERMISSIONS,
      ...['create', 'update', 'delete'].map((action) =>
        unconditioned(`${USER_UID}.${action}`, USER_UID, { fields: null })
      ),
    ]);

    const created = await gql(create, {}, bearer(jwt));

    expect(created.body.errors).toBeUndefined();

    const { documentId } = created.body.data.createUsersPermissionsUser;
    const updated = await gql(
      `mutation { updateUsersPermissionsUser(documentId: "${documentId}", data: { name: "renamed" }) { name } }`,
      {},
      bearer(jwt)
    );

    expect(updated.body.data.updateUsersPermissionsUser.name).toBe('renamed');

    const deleted = await gql(
      `mutation { deleteUsersPermissionsUser(documentId: "${documentId}") { documentId } }`,
      {},
      bearer(jwt)
    );

    expect(deleted.body.errors).toBeUndefined();
    expect(await strapi.db.query(USER_UID).count({ where: { documentId } })).toBe(0);
  });

  it('has no role mutations, and no permission type', async () => {
    const res = await gql(
      '{ mutations: __type(name: "Mutation") { fields { name } } types: __schema { types { name } } }'
    );
    const mutations = res.body.data.mutations.fields.map(({ name }) => name);
    const queries = (
      await gql('{ queries: __type(name: "Query") { fields { name } } }')
    ).body.data.queries.fields.map(({ name }) => name);
    const types = res.body.data.types.types.map(({ name }) => name);

    expect(mutations).toEqual(
      expect.arrayContaining([
        'login',
        'register',
        'forgotPassword',
        'resetPassword',
        'changePassword',
        'emailConfirmation',
        'createUsersPermissionsUser',
      ])
    );
    expect(mutations.filter((name) => /role/i.test(name))).toEqual([]);
    // A role is read through the user's relation: there is no query that lists them
    expect(queries.filter((name) => /role/i.test(name))).toEqual([]);
    expect(types).toEqual(expect.arrayContaining(['UsersPermissionsUser', 'UsersPermissionsRole']));
    expect(types.filter((name) => /permissionspermission/i.test(name))).toEqual([]);
  });

  it('a typed fragment on UsersPermissionsUser still validates', async () => {
    await seedUpUser(strapi, { email: 'gql-frag@example.com' });

    const { jwt } = (await signIn('gql-frag@example.com')).body.data.login;

    await setRolePermissions(strapi, 'authenticated', [
      ...DEFAULT_AUTHENTICATED_PERMISSIONS,
      unconditioned(`${USER_UID}.find`, USER_UID, { fields: null }),
    ]);

    const res = await gql(
      `query { usersPermissionsUsers { ...Fields } }
       fragment Fields on UsersPermissionsUser { documentId email }`,
      {},
      bearer(jwt)
    );

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.usersPermissionsUsers).toEqual(
      expect.arrayContaining([{ documentId: expect.any(String), email: 'gql-frag@example.com' }])
    );
  });
});

describe('end-users compat: GraphQL sign-in rate limit', () => {
  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: { ...compatConfig(), rateLimit: { enabled: true, storage: 'database' } },
    });
    rq = createRequest({ strapi });
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
  });

  afterAll(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await strapi.destroy();
  });

  it('limits the sixth login attempt like REST', async () => {
    await seedUpUser(strapi, { email: 'gql-rate@example.com' });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      await signIn('gql-rate@example.com', WRONG);
    }

    const sixth = await signIn('gql-rate@example.com', WRONG);

    expect(sixth.body.data).toBeNull();
    expect(sixth.body.errors[0].message).toMatch(/too many requests/i);
  });
});

describe('end-users compat: GraphQL login with the refresh cookie', () => {
  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: { ...compatConfig({ refresh: { enabled: true, httpOnly: true } }) },
    });
    rq = createRequest({ strapi });
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
  });

  afterAll(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await strapi.destroy();
  });

  it('sets the refresh cookie, as /local does, when the refresh token is kept out of the body', async () => {
    await seedUpUser(strapi, { email: 'gql-cookie@example.com' });

    const res = await signIn('gql-cookie@example.com');
    const cookies = (res.headers['set-cookie'] ?? []) as string[];

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.login.jwt).toEqual(expect.any(String));
    expect(cookies.find((cookie) => cookie.startsWith('strapi_up_refresh='))).toContain('HttpOnly');
  });
});
