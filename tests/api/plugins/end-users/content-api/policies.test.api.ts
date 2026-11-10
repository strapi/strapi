/**
 * The route policies a project puts on its own REST routes (`is-authenticated`, `has-role`,
 * `is-verified`, `has-two-factor`), over the whole stack: a custom route per policy, called by an
 * anonymous caller, an API token and signed-in users the policy lets through or refuses. What each
 * policy decides is in its unit test (`server/src/policies/__tests__`).
 */
import { createAuthRequest, createRequest } from 'api-tests/request';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  bearer,
  createSignedInUser,
  emptyTables,
  resetRoles,
} from '../utils/permissions';

const USER_UID = 'plugin::end-users.user';
const ROLE_UID = 'plugin::end-users.role';
const PERMISSION_UID = 'plugin::end-users.permission';
const BASE = '/end-users-test/policies';

/**
 * One route per policy. The scope is one the end-users strategy lets any of its callers through
 * (`permissions.forCaller`), so the Public role reaches the policy too: a project would grant its
 * own action to the roles that may call the route, Public included.
 */
const ROUTES: Record<string, unknown[]> = {
  authenticated: ['plugin::end-users.is-authenticated'],
  editor: [{ name: 'plugin::end-users.has-role', config: { roles: ['Editors'] } }],
  'editor-and-reviewer': [
    {
      name: 'plugin::end-users.has-role',
      config: { roles: ['Editors', 'Reviewers'], mode: 'all' },
    },
  ],
  verified: ['plugin::end-users.is-verified'],
  'two-factor': ['plugin::end-users.has-two-factor'],
};

const routesFor = (policies: Record<string, unknown[]>) =>
  Object.entries(policies).map(([name, list]) => ({
    method: 'GET',
    path: `${BASE}/${name}`,
    handler(ctx) {
      ctx.body = { passed: name, user: ctx.state.user?.documentId ?? null };
    },
    config: {
      auth: { scope: ['plugin::end-users.permissions.forCaller'] },
      policies: list,
    },
  }));

/** A 403 with the policy's code, as a front end reads it */
const refused = (res, code: string) => {
  expect(res.statusCode).toBe(403);
  expect(res.body.error).toMatchObject({ status: 403, name: 'PolicyError', details: { code } });
};

describe('end-users: the route policies on a project`s own routes', () => {
  let strapi;
  let rq;
  let rqAdmin;
  let signUps = 0;

  /** A user who signed up, with the roles named, verified or not, with two-factor or not */
  const userWith = async ({
    roles = [] as string[],
    emailVerified = false,
    twoFactorEnabled = false,
  } = {}) => {
    signUps += 1;

    const { token, documentId } = await createSignedInUser(rq, `policy-${signUps}@example.com`);

    if (roles.length > 0) {
      const all = (await strapi.db.query(ROLE_UID).findMany({})) as Array<{
        documentId: string;
        name: string;
      }>;

      await strapi.documents(USER_UID).update({
        documentId,
        data: {
          roles: { set: all.filter((role) => roles.includes(role.name)).map((r) => r.documentId) },
        },
      });
    }

    // Straight to the row: these are what the engine sets once a user verifies or enrols
    await strapi.db
      .query(USER_UID)
      .update({ where: { documentId }, data: { emailVerified, twoFactorEnabled } });

    return { token, documentId };
  };

  const get = (route: string, headers: Record<string, string> = {}) =>
    rq.get(`/api${BASE}/${route}`, { headers });

  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: { trustedOrigins: [TEST_ORIGIN] },
      // Once the plugins are loaded: a route's policies are resolved when it is added
      async bootstrap({ strapi: instance }) {
        instance.server.routes({ type: 'content-api', routes: routesFor(ROUTES) });
      },
    });
    rq = createRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });

    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await resetRoles(strapi);

    const roles = strapi.plugin('end-users').service('role');

    await roles.create({ name: 'Editors' });
    await roles.create({ name: 'Reviewers' });
  });

  afterAll(async () => {
    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await strapi.db.query(PERMISSION_UID).deleteMany({ where: { role: { type: 'custom' } } });
    await strapi.db.query(ROLE_UID).deleteMany({ where: { type: 'custom' } });
    await strapi.destroy();
  });

  it('refuses an anonymous caller on every route, as one who has to sign in', async () => {
    for (const route of Object.keys(ROUTES)) {
      // eslint-disable-next-line no-await-in-loop
      const res = await get(route);

      refused(res, 'AUTHENTICATION_REQUIRED');
      expect(res.body.error.message).toBe('You need to sign in to do this.');
    }
  });

  it('refuses an API token: it is not a signed-in user', async () => {
    const created = await rqAdmin.post('/admin/api-tokens', {
      body: {
        name: `end-users-policies-${Date.now()}`,
        description: 'test',
        type: 'full-access',
        lifespan: null,
      },
    });

    expect(created.status).toBe(201);

    const token = created.body.data.accessKey as string;

    try {
      refused(await get('authenticated', bearer(token)), 'AUTHENTICATION_REQUIRED');
    } finally {
      await rqAdmin.delete(`/admin/api-tokens/${created.body.data.id}`);
    }
  });

  it('lets a signed-in user through is-authenticated', async () => {
    const { token, documentId } = await userWith();
    const res = await get('authenticated', bearer(token));

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ passed: 'authenticated', user: documentId });
  });

  it('lets a user holding the role through has-role, and refuses one who does not', async () => {
    const editor = await userWith({ roles: ['Authenticated', 'Editors'] });
    const reviewer = await userWith({ roles: ['Authenticated', 'Reviewers'] });

    expect((await get('editor', bearer(editor.token))).statusCode).toBe(200);

    const res = await get('editor', bearer(reviewer.token));

    refused(res, 'ROLE_REQUIRED');
    // The message does not tell a caller which roles would do
    expect(res.body.error.message).toBe('Your roles do not allow this.');
  });

  it('needs every role with mode all', async () => {
    const both = await userWith({ roles: ['Editors', 'Reviewers'] });
    const one = await userWith({ roles: ['Editors'] });

    expect((await get('editor-and-reviewer', bearer(both.token))).statusCode).toBe(200);
    refused(await get('editor-and-reviewer', bearer(one.token)), 'ROLE_REQUIRED');
  });

  it('lets a verified user through is-verified, and refuses one who has not verified', async () => {
    const verified = await userWith({ emailVerified: true });
    const unverified = await userWith({ emailVerified: false });

    expect((await get('verified', bearer(verified.token))).statusCode).toBe(200);
    refused(await get('verified', bearer(unverified.token)), 'EMAIL_NOT_VERIFIED');
  });

  it('lets a user with two-factor authentication through has-two-factor, and refuses one without', async () => {
    const enrolled = await userWith({ twoFactorEnabled: true });
    const without = await userWith({ twoFactorEnabled: false });

    expect((await get('two-factor', bearer(enrolled.token))).statusCode).toBe(200);
    refused(await get('two-factor', bearer(without.token)), 'TWO_FACTOR_REQUIRED');

    // Read on each request: turning it off refuses the very next one
    await strapi.db
      .query(USER_UID)
      .update({ where: { documentId: enrolled.documentId }, data: { twoFactorEnabled: false } });

    refused(await get('two-factor', bearer(enrolled.token)), 'TWO_FACTOR_REQUIRED');
  });
});

describe('end-users: has-role with no roles', () => {
  it('stops the start, so a route is never open to everyone by mistake', async () => {
    await expect(
      createEndUsersInstance({
        async bootstrap({ strapi: instance }) {
          instance.server.routes({
            type: 'content-api',
            routes: routesFor({
              misconfigured: [{ name: 'plugin::end-users.has-role', config: { roles: [] } }],
            }),
          });
        },
      })
    ).rejects.toThrow('Invalid config passed to "plugin::end-users.has-role" policy.');
  });
});
