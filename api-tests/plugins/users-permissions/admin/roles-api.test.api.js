'use strict';

// Test a simple default API with no relations

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

let strapi;
let rq;
const data = {};
const internals = {
  role: {
    name: 'Test Role',
    description: 'Some random test role',
  },
};

/** ***************************
 * TESTS
 **************************** */
describe('Roles API', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('Create Role', async () => {
    const res = await rq({
      method: 'POST',
      url: '/users-permissions/roles',
      body: {
        ...internals.role,
        permissions: [],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  test('List Roles', async () => {
    const res = await rq({
      method: 'GET',
      url: '/users-permissions/roles',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.roles).toEqual(
      expect.arrayContaining([expect.objectContaining(internals.role)])
    );

    data.role = res.body.roles.find((r) => r.name === internals.role.name);
  });

  test('Delete Role', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/users-permissions/roles/${data.role.id}`,
    });

    expect(res.statusCode).toBe(200);
  });
});
