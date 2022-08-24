'use strict';

const { omit } = require('lodash');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

describe('Admin API Token v2 CRUD (e2e)', () => {
  let rq;
  let strapi;

  const deleteAllTokens = async () => {
    const tokens = await strapi.admin.services['api-token'].list();
    const promises = [];
    tokens.forEach(({ id }) => {
      promises.push(strapi.admin.services['api-token'].revoke(id));
    });
    await Promise.all(promises);
  };

  // Initialization Actions
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // delete tokens
    await deleteAllTokens();
  });

  // Cleanup actions
  afterAll(async () => {
    await strapi.destroy();
  });

  // create a predictable valid token that we can test with (delete, list, etc)
  let currentTokens = 0;
  const createValidToken = async (token = {}) => {
    const body = {
      type: 'read-only',
      // eslint-disable-next-line no-plusplus
      name: `token_${String(currentTokens++)}`,
      description: 'generic description',
      ...token,
    };

    const req = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(req.status).toEqual(201);
    return req.body.data;
  };

  test('Fails to create an api token (missing parameters from the body)', async () => {
    const body = {
      name: 'api-token_tests-failBody',
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

  test('Fails to create an api token (invalid `type` in the body)', async () => {
    const body = {
      name: 'api-token_tests-failType',
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
        message: 'type must be one of the following values: read-only, full-access, custom',
        details: {
          errors: [
            {
              path: ['type'],
              name: 'ValidationError',
              message: 'type must be one of the following values: read-only, full-access, custom',
            },
          ],
        },
      },
    });
  });

  test('Creates a read-only api token', async () => {
    const body = {
      name: 'api-token_tests-readonly',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      accessKey: expect.any(String),
      name: body.name,
      permissions: [],
      description: body.description,
      type: body.type,
      id: expect.any(Number),
      createdAt: expect.any(String),
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Creates a token without a lifespan', async () => {
    const body = {
      name: 'api-token_tests-no-lifespan',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      accessKey: expect.any(String),
      name: body.name,
      permissions: [],
      description: body.description,
      type: body.type,
      id: expect.any(Number),
      createdAt: expect.any(String),
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Creates a token with a lifespan', async () => {
    const body = {
      name: 'api-token_tests-lifespan',
      description: 'api-token_tests-description',
      type: 'read-only',
      lifespan: 12345,
    };

    const minExpires = Date.now() + body.lifespan;

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toStrictEqual({
      accessKey: expect.any(String),
      name: body.name,
      permissions: [],
      description: body.description,
      type: body.type,
      id: expect.any(Number),
      createdAt: expect.any(String),
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: expect.any(String),
      lifespan: body.lifespan,
    });
    expect(Date.parse(res.body.data.expiresAt)).toBeGreaterThanOrEqual(minExpires);
  });

  test('Creates a token with a null lifespan', async () => {
    const body = {
      name: 'api-token_tests-nulllifespan',
      description: 'api-token_tests-description',
      type: 'read-only',
      lifespan: null,
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
      permissions: [],
      description: body.description,
      type: body.type,
      id: expect.any(Number),
      createdAt: expect.any(String),
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: body.lifespan,
    });
  });

  test('Fails to create a token with invalid lifespan', async () => {
    const body = {
      name: 'api-token_tests-lifespan',
      description: 'api-token_tests-description',
      type: 'read-only',
      lifespan: -1,
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
        message: expect.any(String),
        details: {},
      },
    });
    expect(res.body.error.message).toContain('lifespan');
  });

  test('Fails to create a non-custom api token with permissions', async () => {
    const body = {
      name: 'api-token_tests-readonlyFailWithPermissions',
      description: 'api-token_tests-description',
      type: 'read-only',
      permissions: ['admin::thing.action'],
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
        message: 'Non-custom tokens should not reference permissions',
        details: {},
      },
    });
  });

  /**
   * TODO: Discuss: Which behaviour do we want? Should an empty array be treated the same as omitted/undefined?
   * Easy to change in assertCustomTokenPermissionsValidity by checking isEmpty (to allow empty) vs !attributes.permissions
   */

  test('Creates a non-custom api token with empty permissions attribute', async () => {
    const body = {
      name: 'api-token_tests-fullAccessFailWithEmptyPermissions',
      description: 'api-token_tests-description',
      type: 'full-access',
      permissions: [],
    };

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      accessKey: expect.any(String),
      name: body.name,
      permissions: [],
      description: body.description,
      type: body.type,
      id: expect.any(Number),
      createdAt: expect.any(String),
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Creates a custom api token', async () => {
    const body = {
      name: 'api-token_tests-customSuccess',
      description: 'api-token_tests-description',
      type: 'custom',
      permissions: ['admin::subject.action', 'plugin::foo.bar.action'],
    };

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      accessKey: expect.any(String),
      name: body.name,
      permissions: body.permissions,
      description: body.description,
      type: body.type,
      id: expect.any(Number),
      createdAt: expect.any(String),
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Fails to create a custom api token without permissions', async () => {
    const body = {
      name: 'api-token_tests-customFail',
      description: 'api-token_tests-description',
      type: 'custom',
      permissions: [],
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
        message: 'Missing permissions attribute for custom token',
        details: {},
      },
    });
  });

  test('Creates an api token without a description (successfully)', async () => {
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
    expect(res.body.data).toMatchObject({
      accessKey: expect.any(String),
      name: body.name,
      permissions: [],
      description: '',
      type: body.type,
      id: expect.any(Number),
      createdAt: expect.any(String),
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Creates an api token with trimmed description and name (successfully)', async () => {
    const body = {
      name: '  api-token_tests-spaces-at-the-end   ',
      description: '  api-token_tests-description-with-spaces-at-the-end   ',
      type: 'read-only',
    };

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      accessKey: expect.any(String),
      name: 'api-token_tests-spaces-at-the-end',
      permissions: [],
      description: 'api-token_tests-description-with-spaces-at-the-end',
      type: body.type,
      id: expect.any(Number),
      createdAt: expect.any(String),
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('List all tokens (successfully)', async () => {
    await deleteAllTokens();

    // create 4 tokens
    const tokens = [];
    tokens.push(
      await createValidToken({
        type: 'custom',
        permissions: ['admin::model.model.read', 'admin::model.model.create'],
      })
    );
    tokens.push(await createValidToken({ type: 'full-access' }));
    tokens.push(await createValidToken({ type: 'read-only' }));
    tokens.push(await createValidToken({ lifespan: 12345 }));
    tokens.push(await createValidToken());

    const res = await rq({
      url: '/admin/api-tokens',
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(tokens.length);
    // check that each token exists in data
    tokens.forEach((token) => {
      const t = res.body.data.find((t) => t.id === token.id);
      if (t.permissions) {
        t.permissions = t.permissions.sort();
        // eslint-disable-next-line no-param-reassign
        token.permissions = token.permissions.sort();
      }
      expect(t).toMatchObject(omit(token, ['accessKey']));
    });
  });

  test('Deletes a token (successfully)', async () => {
    const token = await createValidToken();

    const res = await rq({
      url: `/admin/api-tokens/${token.id}`,
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: token.name,
      permissions: token.permissions,
      description: token.description,
      type: token.type,
      id: token.id,
      createdAt: token.createdAt,
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Does not return an error if the ressource to delete does not exist', async () => {
    const res = await rq({
      url: '/admin/api-tokens/42',
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeNull();
  });

  test('Retrieves a non-custom token (successfully)', async () => {
    const token = await createValidToken({
      type: 'read-only',
    });

    const res = await rq({
      url: `/admin/api-tokens/${token.id}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: token.name,
      permissions: token.permissions,
      description: token.description,
      type: token.type,
      id: token.id,
      createdAt: token.createdAt,
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Retrieves a custom token (successfully)', async () => {
    const token = await createValidToken({
      type: 'custom',
      permissions: ['admin::model.model.read'],
    });

    const res = await rq({
      url: `/admin/api-tokens/${token.id}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: token.name,
      permissions: token.permissions,
      description: token.description,
      type: token.type,
      id: token.id,
      createdAt: token.createdAt,
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Returns a 404 if the ressource to retrieve does not exist', async () => {
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

  test('Updates a token (successfully)', async () => {
    // create a token
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

    const token = res.body.data;

    const updatedBody = {
      name: 'api-token_tests-updated-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const updatedRes = await rq({
      url: `/admin/api-tokens/${token.id}`,
      method: 'PUT',
      body: updatedBody,
    });

    expect(updatedRes.statusCode).toBe(200);
    expect(updatedRes.body.data).toMatchObject({
      name: updatedBody.name,
      permissions: [],
      description: updatedBody.description,
      type: updatedBody.type,
      id: token.id,
      createdAt: token.createdAt,
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
    // expect(updatedRes.body.data.updated)
  });

  test('Returns a 404 if the ressource to update does not exist', async () => {
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

  test('Updates a token with partial payload (successfully)', async () => {
    const token = await createValidToken();

    const body = {
      description: 'api-token_tests-re-updated-description',
    };

    const res = await rq({
      url: `/admin/api-tokens/${token.id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: token.name,
      permissions: token.permissions,
      description: body.description, // updated field
      type: token.type,
      id: token.id,
      createdAt: token.createdAt,
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Fails to update an api token (invalid `type` in the body)', async () => {
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
              message: 'type must be one of the following values: read-only, full-access, custom',
              name: 'ValidationError',
              path: ['type'],
            },
          ],
        },
        message: 'type must be one of the following values: read-only, full-access, custom',
        name: 'ValidationError',
        status: 400,
      },
    });
  });

  test('Updates a token when passing a `null` description (successfully)', async () => {
    const token = await createValidToken();

    const body = {
      description: null,
    };

    const res = await rq({
      url: `/admin/api-tokens/${token.id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: token.name,
      permissions: token.permissions,
      description: '',
      type: token.type,
      id: token.id,
      createdAt: token.createdAt,
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Updates a token but not the description if no description is passed (successfully)', async () => {
    const token = await createValidToken();

    const body = {
      name: 'api-token_tests-newNameWithoutDescUpdate',
    };

    const res = await rq({
      url: `/admin/api-tokens/${token.id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: body.name,
      description: token.description,
      permissions: token.permissions,
      type: token.type,
      id: token.id,
      createdAt: token.createdAt,
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Regenerates an api token access key', async () => {
    const token = await createValidToken();

    const res = await rq({
      url: `/admin/api-tokens/${token.id}/regenerate`,
      method: 'POST',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      accessKey: expect.any(String),
    });
    expect(res.body.data.accessKey).not.toEqual(token.accessKey);
  });

  test('Regenerate throws a NotFound if provided an invalid id', async () => {
    const res = await rq({
      url: `/admin/api-tokens/999999/regenerate`,
      method: 'POST',
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatchObject({
      name: 'NotFoundError',
      status: 404,
    });
  });

  test.todo('Custom token can only be created with valid permissions that exist');
});
