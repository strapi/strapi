'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest, createAuthRequest } = require('api-tests/request');
const { createAuthenticatedUser } = require('../utils');

const GET_PERMISSIONS_ACTION = 'plugin::users-permissions.permissions.getPermissions';

let strapi;

const internals = {
  user: {
    username: 'permissions-test',
    email: 'permissions-test@strapi.io',
    password: 'Test1234',
    confirmed: true,
    provider: 'local',
  },
};

const data = {};

const grantGetPermissions = async (roleType) => {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } });

  await strapi.db
    .query('plugin::users-permissions.permission')
    .create({ data: { action: GET_PERMISSIONS_ACTION, role: role.id } });

  return role;
};

const getPermissionsFor = (action, permissions) => {
  const [type, controller, actionName] = action.split('.');

  return permissions?.[type]?.controllers?.[controller]?.[actionName];
};

const createFullAccessToken = async () => {
  const adminRq = await createAuthRequest({ strapi });

  const res = await adminRq({
    method: 'POST',
    url: '/admin/api-tokens',
    body: {
      name: 'U&P permissions - full access',
      description: '',
      type: 'full-access',
      lifespan: null,
      permissions: null,
    },
  });

  return res.body.data.accessKey;
};

describe('Permissions API', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance({ bypassAuth: false });

    await grantGetPermissions('authenticated');
    await grantGetPermissions('public');

    const { jwt, user } = await createAuthenticatedUser({ strapi, userInfo: internals.user });

    data.user = user;
    data.jwt = jwt;
    data.apiToken = await createFullAccessToken();
  });

  afterAll(async () => {
    await strapi.db
      .query('plugin::users-permissions.permission')
      .deleteMany({ where: { action: GET_PERMISSIONS_ACTION } });
    await strapi.db.query('plugin::users-permissions.user').deleteMany();
    await strapi.db.query('admin::api-token').deleteMany();
    await strapi.destroy();
  });

  test("Returns the authenticated caller's own permissions", async () => {
    const rq = createRequest({ strapi }).setToken(data.jwt);

    const res = await rq({ method: 'GET', url: '/api/users-permissions/permissions' });

    expect(res.statusCode).toBe(200);

    // The action being called must be reported as enabled — see strapi/strapi#15378
    expect(getPermissionsFor(GET_PERMISSIONS_ACTION, res.body.permissions)).toEqual({
      enabled: true,
      policy: '',
    });

    // An action only the public role holds must stay disabled for this caller
    expect(
      getPermissionsFor('plugin::users-permissions.auth.register', res.body.permissions)
    ).toEqual({ enabled: false, policy: '' });
  });

  test('Returns the public role permissions for an anonymous caller', async () => {
    const rq = createRequest({ strapi });

    const res = await rq({ method: 'GET', url: '/api/users-permissions/permissions' });

    expect(res.statusCode).toBe(200);
    expect(getPermissionsFor(GET_PERMISSIONS_ACTION, res.body.permissions)).toEqual({
      enabled: true,
      policy: '',
    });
    expect(
      getPermissionsFor('plugin::users-permissions.auth.register', res.body.permissions)
    ).toEqual({ enabled: true, policy: '' });
  });

  test('Reports every action as enabled for a full-access API token', async () => {
    const rq = createRequest({ strapi }).setToken(data.apiToken);

    const res = await rq({ method: 'GET', url: '/api/users-permissions/permissions' });

    expect(res.statusCode).toBe(200);

    // A token is not backed by a role, so it must not be answered with the public role's tree
    const allActions = Object.values(res.body.permissions).flatMap((group) =>
      Object.values(group.controllers).flatMap((controller) => Object.values(controller))
    );

    expect(allActions.length).toBeGreaterThan(0);
    expect(allActions.every(({ enabled }) => enabled === true)).toBe(true);
  });
});
