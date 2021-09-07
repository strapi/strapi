'use strict';

// Test a simple default API with no relations

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createContentAPIRequest } = require('../../../../../test/helpers/request');

let strapi;
let rq;

let data = {};

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
      url: '/api/users',
      body: user,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      username: user.username,
      email: user.email,
    });

    data.user = res.body;
  });

  test('Delete user', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/api/users/${data.user.id}`,
    });

    expect(res.statusCode).toBe(200);
  });
});
