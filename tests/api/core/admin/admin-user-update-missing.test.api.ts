'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

/**
 * Updating an admin user that does not exist answers 404, with or without a password,
 * and the service resolves null instead of throwing. Runs in CE and EE.
 */
describe('Admin user update (missing user)', () => {
  let strapi: any;
  let rq: any;

  const missingId = 999999;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('runs the service of the expected edition', () => {
    const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';
    // Only the EE user service counts active users for the seat limit
    const isEEService =
      typeof strapi.service('admin::user').getCurrentActiveUserCount === 'function';

    expect(isEEService).toBe(edition === 'EE');
  });

  test.each([
    ['without a password', { lastname: 'doe' }],
    ['with a password', { password: 'Testing1234' }],
  ])('PUT /admin/users/:id answers 404 %s', async (_label, body) => {
    const res = await rq({ url: `/admin/users/${missingId}`, method: 'PUT', body });

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      error: {
        details: {},
        message: 'User does not exist',
        name: 'NotFoundError',
        status: 404,
      },
    });
  });

  test.each([
    ['without a password', { firstname: 'Kai' }],
    ['with a password', { password: 'Testing1234' }],
  ])('updateById resolves null %s', async (_label, attributes) => {
    const usersBefore = await strapi.db.query('admin::user').count();

    await expect(
      strapi.service('admin::user').updateById(missingId, attributes)
    ).resolves.toBeNull();

    expect(await strapi.db.query('admin::user').count()).toBe(usersBefore);
  });
});
