'use strict';

// Test a simple default API with no relations

const bcrypt = require('bcryptjs');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');
const { createAuthenticatedUser } = require('../utils');

let strapi;
let rq;

const internals = {
  role: {
    name: 'Test Role',
    description: 'Some random test role',
  },
};
const data = {};

describe('Users API', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('Create and get Role', async () => {
    const createRes = await rq({
      method: 'POST',
      url: '/users-permissions/roles',
      body: {
        ...internals.role,
        permissions: [],
      },
    });

    expect(createRes.statusCode).toBe(200);
    expect(createRes.body).toMatchObject({ ok: true });

    const findRes = await rq({
      method: 'GET',
      url: '/users-permissions/roles',
    });

    expect(findRes.statusCode).toBe(200);
    expect(findRes.body.roles).toEqual(
      expect.arrayContaining([expect.objectContaining(internals.role)])
    );

    // eslint-disable-next-line no-unused-vars
    const { nb_users: nbUsers, ...role } = findRes.body.roles.find(
      (r) => r.name === internals.role.name
    );

    expect(role).toMatchObject(internals.role);

    data.role = role;
  });

  test('Create User', async () => {
    const user = {
      username: 'User 1',
      email: 'user1@strapi.io',
      password: 'test1234',
      role: data.role.id,
    };

    const res = await rq({
      method: 'POST',
      url: '/users',
      body: user,
    });

    // check that password was hashed
    const userDb = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: {
        email: user.email,
      },
    });

    expect(bcrypt.compareSync(user.password, userDb.password)).toBe(true);

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      username: user.username,
      email: user.email,
      role: data.role,
    });

    data.user = res.body;
  });

  test('Updating unknown user returns 404', async () => {
    const res = await rq({
      method: 'PUT',
      url: '/users/99999999',
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      error: {
        message: 'User not found',
        name: 'NotFoundError',
        status: 404,
      },
    });
  });

  describe('Read users', () => {
    test('without filter', async () => {
      const res = await rq({
        method: 'GET',
        url: '/users',
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body).toMatchObject([
        {
          id: expect.anything(),
          username: data.user.username,
          email: data.user.email,
        },
      ]);
    });

    test('with filter equals', async () => {
      const res = await rq({
        method: 'GET',
        url: '/users',
        qs: {
          filters: {
            username: 'User 1',
          },
        },
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body).toMatchObject([
        {
          id: expect.anything(),
          username: data.user.username,
          email: data.user.email,
        },
      ]);
    });

    test('should populate role', async () => {
      const res = await rq({
        method: 'GET',
        url: '/users?populate=role',
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body).toMatchObject([
        {
          id: expect.anything(),
          username: data.user.username,
          email: data.user.email,
          role: data.role,
        },
      ]);
    });

    test('should not populate users in role', async () => {
      const res = await rq({
        method: 'GET',
        url: '/users?populate[role][populate][0]=users',
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body).toMatchObject([
        {
          id: expect.anything(),
          username: data.user.username,
          email: data.user.email,
          role: data.role,
        },
      ]);
      expect(body[0].role).not.toHaveProperty('users');
    });
  });

  describe('Read an user', () => {
    test('should populate role', async () => {
      const res = await rq({
        method: 'GET',
        url: `/users/${data.user.id}?populate=role`,
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body).toMatchObject({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.role,
      });
    });

    test('should not populate role', async () => {
      const res = await rq({
        method: 'GET',
        url: `/users/${data.user.id}`,
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body).toMatchObject({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
      });
      expect(body).not.toHaveProperty('role');
    });

    test('should not populate users in role', async () => {
      const res = await rq({
        method: 'GET',
        url: `/users/${data.user.id}?populate[role][populate][0]=users`,
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body).toMatchObject({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.role,
      });
      expect(body.role).not.toHaveProperty('users');
    });
  });

  test('Delete user', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/users/${data.user.id}`,
    });

    expect(res.statusCode).toBe(200);
  });
});

describe('Users API private query params', () => {
  let authenticatedStrapi;
  let authenticatedRq;
  let victimUser;

  const enableUserReadForAuthenticatedRole = async (instance) => {
    const role = await instance.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });
    const roleService = instance.service('plugin::users-permissions.role');
    const roleDetails = await roleService.findOne(role.id);

    roleDetails.permissions['plugin::users-permissions'] = roleDetails.permissions[
      'plugin::users-permissions'
    ] || { controllers: {} };

    const controllers = roleDetails.permissions['plugin::users-permissions'].controllers || {};
    const userController = controllers.user || {};
    userController.find = { enabled: true, policy: '' };
    userController.findOne = { enabled: true, policy: '' };
    userController.count = { enabled: true, policy: '' };

    roleDetails.permissions['plugin::users-permissions'].controllers = {
      ...controllers,
      user: userController,
    };

    await roleService.updateRole(role.id, { permissions: roleDetails.permissions });
  };

  beforeAll(async () => {
    authenticatedStrapi = await createStrapiInstance({ bypassAuth: false });
    await enableUserReadForAuthenticatedRole(authenticatedStrapi);

    const authenticatedRole = await authenticatedStrapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });

    victimUser = await authenticatedStrapi.db.query('plugin::users-permissions.user').create({
      data: {
        username: 'victim',
        email: 'victim@strapi.io',
        password: 'Test1234',
        provider: 'local',
        confirmed: true,
        resetPasswordToken: 'private-reset-token',
        role: authenticatedRole.id,
      },
    });

    const { jwt } = await createAuthenticatedUser({
      strapi: authenticatedStrapi,
      userInfo: {
        username: 'attacker',
        email: 'attacker@strapi.io',
        password: 'Test1234',
        confirmed: true,
        provider: 'local',
      },
    });

    authenticatedRq = createContentAPIRequest({
      strapi: authenticatedStrapi,
      auth: { token: jwt },
    });
  });

  afterAll(async () => {
    await authenticatedStrapi.db.query('plugin::users-permissions.user').deleteMany();
    await authenticatedStrapi.destroy();
  });

  test('does not allow top-level where to filter users by private reset password token', async () => {
    const baselineRes = await authenticatedRq({
      method: 'GET',
      url: '/users',
    });

    expect(baselineRes.statusCode).toBe(200);
    expect(baselineRes.body).toHaveLength(2);

    const oracleRes = await authenticatedRq({
      method: 'GET',
      url: '/users',
      qs: {
        where: {
          resetPasswordToken: {
            $startsWith: 'private-reset',
          },
        },
      },
    });

    expect(oracleRes.statusCode).toBe(200);
    expect(oracleRes.body).toEqual(baselineRes.body);
  });

  test('does not allow top-level private attribute to filter users by reset password token', async () => {
    const baselineRes = await authenticatedRq({
      method: 'GET',
      url: '/users',
    });

    expect(baselineRes.statusCode).toBe(200);
    expect(baselineRes.body).toHaveLength(2);

    const oracleRes = await authenticatedRq({
      method: 'GET',
      url: '/users',
      qs: {
        resetPasswordToken: {
          $startsWith: 'private-reset',
        },
      },
    });

    expect(oracleRes.statusCode).toBe(200);
    expect(oracleRes.body).toEqual(baselineRes.body);
  });

  test('does not allow top-level where to hide a user by private reset password token', async () => {
    const baselineRes = await authenticatedRq({
      method: 'GET',
      url: `/users/${victimUser.id}`,
    });

    expect(baselineRes.statusCode).toBe(200);
    expect(baselineRes.body).toMatchObject({
      id: victimUser.id,
      email: 'victim@strapi.io',
    });

    const oracleRes = await authenticatedRq({
      method: 'GET',
      url: `/users/${victimUser.id}`,
      qs: {
        where: {
          resetPasswordToken: {
            $startsWith: 'does-not-match',
          },
        },
      },
    });

    expect(oracleRes.statusCode).toBe(200);
    expect(oracleRes.body).toEqual(baselineRes.body);
  });

  test('does not allow top-level where to hide the authenticated user by private reset password token', async () => {
    const baselineRes = await authenticatedRq({
      method: 'GET',
      url: '/users/me',
    });

    expect(baselineRes.statusCode).toBe(200);
    expect(baselineRes.body).toMatchObject({
      email: 'attacker@strapi.io',
    });

    const oracleRes = await authenticatedRq({
      method: 'GET',
      url: '/users/me',
      qs: {
        where: {
          resetPasswordToken: {
            $startsWith: 'private-reset',
          },
        },
      },
    });

    expect(oracleRes.statusCode).toBe(200);
    expect(oracleRes.body).toEqual(baselineRes.body);
  });

  test('does not allow top-level private attribute to change the users count', async () => {
    const baselineRes = await authenticatedRq({
      method: 'GET',
      url: '/users/count',
    });

    expect(baselineRes.statusCode).toBe(200);
    expect(baselineRes.body).toBe(2);

    const oracleRes = await authenticatedRq({
      method: 'GET',
      url: '/users/count',
      qs: {
        resetPasswordToken: {
          $startsWith: 'private-reset',
        },
      },
    });

    expect(oracleRes.statusCode).toBe(200);
    expect(oracleRes.body).toBe(baselineRes.body);
  });
});
