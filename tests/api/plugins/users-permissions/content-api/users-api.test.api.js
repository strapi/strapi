'use strict';

// Test a simple default API with no relations

const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

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
