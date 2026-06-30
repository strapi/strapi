'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;

describe('CM API - hidden content type read (#23622)', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('super admin can read plugin::users-permissions.role via content manager', async () => {
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
    });

    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/plugin::users-permissions.role/${role.documentId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        documentId: role.documentId,
        name: role.name,
      })
    );
  });
});
