'use strict';

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

/**
 * == Test Suite Overview ==
 *
 * N°   Description
 * -------------------------------------------
 * 1. Fails to create an api token (missing parameters from the body)
 * 2. Fails to create an api token (invalid `type` in the body)
 * 3. Creates an api token (successfully)
 * 4. Creates an api token without a description (successfully)
 * 5. Creates an api token with trimmed description and name (successfully)
 * 6. List all tokens (successfully)
 * 7. Deletes a token (successfully)
 * 8. Does not return an error if the ressource to delete does not exist
 * 9. Retrieves a token (successfully)
 * 10. Returns a 404 if the ressource to retrieve does not exist
 * 11. Updates a token (successfully)
 * 12. Returns a 404 if the ressource to update does not exist
 * 13. Updates a token with partial payload (successfully)
 * 14. Fails to update an api token (invalid `type` in the body)
 * 15. Updates a token when passing a `null` description (successfully)
 * 16. Updates a token but not the description if no description is passed (successfully)
 */

describe('Admin API Token CRUD (e2e)', () => {
  let rq;
  let strapi;

  const apiTokens = [];

  // Initialization Actions
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  // Cleanup actions
  afterAll(async () => {
    await strapi.destroy();
  });

  test('1. Fails to create an api token (missing parameters from the body)', async () => {
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
      data: null,
      error: {
        status: 400,
        name: 'ValidationError',
        message: 'type is a required field',
        details: {
          errors: [
            {
              path: ['type'],
              name: 'ValidationError',
              message: 'type is a required field',
            },
          ],
        },
      },
    });
  });

  test('2. Fails to create an api token (invalid `type` in the body)', async () => {
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
      data: null,
      error: {
        status: 400,
        name: 'ValidationError',
        message: 'type must be one of the following values: read-only, full-access',
        details: {
          errors: [
            {
              path: ['type'],
              name: 'ValidationError',
              message: 'type must be one of the following values: read-only, full-access',
            },
          ],
        },
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
      createdAt: expect.any(String),
    });

    apiTokens.push(res.body.data);
  });

  test('4. Creates an api token without a description (successfully)', async () => {
    const body = {
      name: 'api-token_tests-without-description',
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
      createdAt: expect.any(String),
    });

    apiTokens.push(res.body.data);
  });

  test('5. Creates an api token with trimmed description and name (successfully)', async () => {
    const body = {
      name: 'api-token_tests-spaces-at-the-end   ',
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
      name: 'api-token_tests-spaces-at-the-end',
      description: 'api-token_tests-description-with-spaces-at-the-end',
      type: body.type,
      id: expect.any(Number),
      createdAt: expect.any(String),
    });

    apiTokens.push(res.body.data);
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
        createdAt: expect.any(String),
      },
      {
        id: expect.any(Number),
        name: 'api-token_tests-spaces-at-the-end',
        description: 'api-token_tests-description-with-spaces-at-the-end',
        type: 'read-only',
        createdAt: expect.any(String),
      },
      {
        id: expect.any(Number),
        name: 'api-token_tests-without-description',
        description: '',
        type: 'full-access',
        createdAt: expect.any(String),
      },
    ]);
  });

  test('7. Deletes a token (successfully)', async () => {
    const res = await rq({
      url: `/admin/api-tokens/${apiTokens[2].id}`,
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toStrictEqual({
      name: apiTokens[2].name,
      description: apiTokens[2].description,
      type: apiTokens[2].type,
      id: apiTokens[2].id,
      createdAt: apiTokens[2].createdAt,
    });
  });

  test('8. Does not return an error if the ressource to delete does not exist', async () => {
    const res = await rq({
      url: '/admin/api-tokens/42',
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeNull();
  });

  test('9. Retrieves a token (successfully)', async () => {
    const res = await rq({
      url: `/admin/api-tokens/${apiTokens[0].id}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toStrictEqual({
      name: apiTokens[0].name,
      description: apiTokens[0].description,
      type: apiTokens[0].type,
      id: apiTokens[0].id,
      createdAt: apiTokens[0].createdAt,
    });
  });

  test('10. Returns a 404 if the ressource to retrieve does not exist', async () => {
    const res = await rq({
      url: '/admin/api-tokens/42',
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      data: null,
      error: {
        status: 404,
        name: 'NotFoundError',
        message: 'API Token not found',
        details: {},
      },
    });
  });

  test('11. Updates a token (successfully)', async () => {
    const body = {
      name: 'api-token_tests-updated-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const res = await rq({
      url: `/admin/api-tokens/${apiTokens[0].id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toStrictEqual({
      name: body.name,
      description: body.description,
      type: body.type,
      id: apiTokens[0].id,
      createdAt: apiTokens[0].createdAt,
    });

    apiTokens[0] = res.body.data;
  });

  test('12. Returns a 404 if the ressource to update does not exist', async () => {
    const body = {
      name: 'api-token_tests-updated-name',
      description: 'api-token_tests-updated-description',
      type: 'read-only',
    };

    const res = await rq({
      url: '/admin/api-tokens/42',
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      data: null,
      error: {
        status: 404,
        name: 'NotFoundError',
        message: 'API Token not found',
        details: {},
      },
    });
  });

  test('13. Updates a token with partial payload (successfully)', async () => {
    const body = {
      description: 'api-token_tests-re-updated-description',
    };

    const res = await rq({
      url: `/admin/api-tokens/${apiTokens[0].id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: apiTokens[0].name,
      description: body.description,
      type: apiTokens[0].type,
      id: apiTokens[0].id,
      createdAt: apiTokens[0].createdAt,
    });

    apiTokens[0] = res.body.data;
  });

  test('14. Fails to update an api token (invalid `type` in the body)', async () => {
    const body = {
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'invalid-type',
    };

    const res = await rq({
      url: '/admin/api-tokens/1',
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      data: null,
      error: {
        details: {
          errors: [
            {
              message: 'type must be one of the following values: read-only, full-access',
              name: 'ValidationError',
              path: ['type'],
            },
          ],
        },
        message: 'type must be one of the following values: read-only, full-access',
        name: 'ValidationError',
        status: 400,
      },
    });
  });

  test('15. Updates a token when passing a `null` description (successfully)', async () => {
    const body = {
      description: null,
    };

    const res = await rq({
      url: `/admin/api-tokens/${apiTokens[0].id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: apiTokens[0].name,
      description: '',
      type: apiTokens[0].type,
      id: apiTokens[0].id,
      createdAt: apiTokens[0].createdAt,
    });

    apiTokens[0] = res.body.data;
  });

  test('16. Updates a token but not the description if no description is passed (successfully)', async () => {
    const body = {
      name: 'api-token_tests-name',
    };

    const res = await rq({
      url: `/admin/api-tokens/${apiTokens[0].id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: body.name,
      description: apiTokens[0].description,
      type: apiTokens[0].type,
      id: apiTokens[0].id,
      createdAt: apiTokens[0].createdAt,
    });

    apiTokens[0] = res.body.data;
  });
});
