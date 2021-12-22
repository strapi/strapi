'use strict';

// Test a simple default API with no relations

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createContentAPIRequest } = require('../../../../../test/helpers/request');

let strapi;
let rq;

const data = {};

describe('Users API', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('Create User', async () => {
    const user = {
      username: 'User 1',
      email: 'user1@strapi.io',
      password: 'test1234',
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
    });

    data.user = res.body;
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
  });

  test('Delete user', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/users/${data.user.id}`,
    });

    expect(res.statusCode).toBe(200);
  });
});
