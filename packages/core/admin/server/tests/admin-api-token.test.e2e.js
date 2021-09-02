'use strict';

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

/**
 * == Test Suite Overview ==
 *
 * N°   Description
 * -------------------------------------------
 * 1. Fails to creates an api token (missing parameters from the body)
 * 2. Fails to creates an api token (invalid `type` in the body)
 * 3. Creates an api token (successfully)
 * 4. Creates an api token without a description (successfully)
 * 5. Creates an api token with trimmed description and name (successfully)
 * 6. List all tokens (successfully)
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

  test('1. Fails to creates an api token (missing parameters from the body)', async () => {
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

  test('2. Fails to creates an api token (invalid `type` in the body)', async () => {
    const body = {
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'invalid-type',
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
        type: ['type must be one of the following values: read-only, full-access'],
      },
    });
  });

  test('3. Creates an api token (successfully)', async () => {
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
    expect(res.body.data).toStrictEqual({
      accessKey: expect.any(String),
      name: body.name,
      description: body.description,
      type: body.type,
      id: expect.any(Number),
    });
  });

  test('4. Creates an api token without a description (successfully)', async () => {
    const body = {
      name: 'api-token_tests-name-without-description',
      type: 'full-access',
    };

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toStrictEqual({
      accessKey: expect.any(String),
      name: body.name,
      description: '',
      type: body.type,
      id: expect.any(Number),
    });
  });

  test('5. Creates an api token with trimmed description and name (successfully)', async () => {
    const body = {
      name: 'api-token_tests-name-with-spaces-at-the-end   ',
      description: 'api-token_tests-description-with-spaces-at-the-end   ',
      type: 'read-only',
    };

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toStrictEqual({
      accessKey: expect.any(String),
      name: 'api-token_tests-name-with-spaces-at-the-end',
      description: 'api-token_tests-description-with-spaces-at-the-end',
      type: body.type,
      id: expect.any(Number),
    });
  });

  test('6. List all tokens (successfully)', async () => {
    const res = await rq({
      url: '/admin/api-tokens',
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(3);
    expect(res.body.data).toStrictEqual([
      {
        id: expect.any(Number),
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      },
      {
        id: expect.any(Number),
        name: 'api-token_tests-name-with-spaces-at-the-end',
        description: 'api-token_tests-description-with-spaces-at-the-end',
        type: 'read-only',
      },
      {
        id: expect.any(Number),
        name: 'api-token_tests-name-without-description',
        description: '',
        type: 'full-access',
      },
    ]);
  });

  test('7. Deletes a token (successfully)', async () => {
    const res = await rq({
      url: '/admin/api-tokens/3',
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toStrictEqual({
      name: 'api-token_tests-name-with-spaces-at-the-end',
      description: 'api-token_tests-description-with-spaces-at-the-end',
      type: 'read-only',
      id: 3,
    });
  });

  test('8. Does not return an error if the ressource does not exists', async () => {
    const res = await rq({
      url: '/admin/api-tokens/42',
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeNull();
  });
});
