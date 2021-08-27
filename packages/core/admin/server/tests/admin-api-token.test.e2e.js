'use strict';

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

/**
 * == Test Suite Overview ==
 *
 * N°   Description
 * -------------------------------------------
 * 1.  Creates an api token (wrong body)
 * 2.  Creates an api token (successfully)
 */

describe('Admin API Token CRUD (e2e)', () => {
  let rq;
  let strapi;

  // Initialization Actions
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  // Cleanup actions
  afterAll(async () => {
    await strapi.destroy();
  });

  test('1. Creates an api token (wrong body)', async () => {
    const body = {
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
    };

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'ValidationError',
      data: {
        type: ['type is a required field'],
      },
    });
  });

  test('2. Creates an api token (successfully)', async () => {
    const body = {
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).not.toBeNull();
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.accessKey).toBeDefined();
    expect(res.body.data.name).toBe(body.name);
    expect(res.body.data.description).toBe(body.description);
    expect(res.body.data.type).toBe(body.type);
  });

  test('3. Creates an api token without a description (successfully)', async () => {
    const body = {
      name: 'api-token_tests-name-without-description',
      type: 'read-only',
    };

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).not.toBeNull();
    expect(res.body.data.id).toBe(2);
    expect(res.body.data.accessKey).toBeDefined();
    expect(res.body.data.name).toBe(body.name);
    expect(res.body.data.description).toBe('');
    expect(res.body.data.type).toBe(body.type);
  });
});
