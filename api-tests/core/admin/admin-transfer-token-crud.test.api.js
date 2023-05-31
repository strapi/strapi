'use strict';

const { omit } = require('lodash');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const constants = require('../../../packages/core/admin/server/services/constants');

describe('Admin Transfer Token CRUD (api)', () => {
  let rq;
  let strapi;
  let now;
  let nowSpy;

  const FULL_ACCESS = ['push', 'pull'];

  const deleteAllTokens = async () => {
    const tokens = await strapi.admin.services.transfer.token.list();
    const promises = [];
    tokens.forEach(({ id }) => {
      promises.push(strapi.admin.services.transfer.token.revoke(id));
    });
    await Promise.all(promises);
  };

  // Initialization Actions
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    // To eliminate latency in the request and predict the expiry timestamp, we freeze Date.now()
    now = Date.now();
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);

    // delete tokens
    await deleteAllTokens();
  });

  // Cleanup actions
  afterAll(async () => {
    nowSpy.mockRestore();
    await strapi.destroy();
  });

  afterEach(async () => {
    await deleteAllTokens();
  });

  // create a predictable valid token that we can test with (delete, list, etc)
  let currentTokens = 0;
  const createValidToken = async (token = {}) => {
    currentTokens += 1;

    const body = {
      name: `transfer_token_${String(currentTokens)}`,
      description: 'generic description',
      permissions: FULL_ACCESS,
      ...token,
    };

    const req = await rq({
      url: '/admin/transfer/tokens',
      method: 'POST',
      body,
    });

    expect(req.status).toEqual(201);
    return req.body.data;
  };

  test('Fails to create a transfer token (missing parameters from the body)', async () => {
    const body = {
      description: 'transfer-token_tests-description',
    };

    const res = await rq({
      url: '/admin/transfer/tokens',
      method: 'POST',
      body,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toStrictEqual({
      data: null,
      error: {
        status: 400,
        name: 'ValidationError',
        message: '3 errors occurred',
        details: {
          errors: [
            {
              message: 'name must be at least 1 characters',
              name: 'ValidationError',
              path: ['name'],
            },
            {
              path: ['name'],
              name: 'ValidationError',
              message: 'name is a required field',
            },
            {
              path: ['permissions'],
              name: 'ValidationError',
              message: 'permissions is a required field',
            },
          ],
        },
      },
    });
  });

  test('Creates a transfer token without a lifespan', async () => {
    const body = {
      name: 'transfer-token_tests-no-lifespan',
      description: 'transfer-token_tests-description',
      permissions: FULL_ACCESS,
    };

    const res = await rq({
      url: '/admin/transfer/tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toStrictEqual({
      accessKey: expect.any(String),
      name: body.name,
      permissions: expect.arrayContaining(body.permissions),
      description: body.description,
      id: expect.any(Number),
      createdAt: expect.toBeISODate(),
      lastUsedAt: null,
      updatedAt: expect.toBeISODate(),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Creates a transfer token with a 7-day lifespan', async () => {
    const body = {
      name: 'transfer-token_tests-lifespan7',
      description: 'transfer-token_tests-description',
      lifespan: 7 * 24 * 60 * 60 * 1000, // 7 days
      permissions: FULL_ACCESS,
    };

    const res = await rq({
      url: '/admin/transfer/tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toStrictEqual({
      accessKey: expect.any(String),
      name: body.name,
      permissions: expect.arrayContaining(body.permissions),
      description: body.description,
      id: expect.any(Number),
      createdAt: expect.toBeISODate(),
      lastUsedAt: null,
      updatedAt: expect.toBeISODate(),
      expiresAt: expect.toBeISODate(),
      lifespan: String(body.lifespan),
    });

    // Datetime stored in some databases may lose ms accuracy, so allow a range of 2 seconds for timing edge cases
    expect(Date.parse(res.body.data.expiresAt)).toBeGreaterThan(now + body.lifespan - 2000);
    expect(Date.parse(res.body.data.expiresAt)).toBeLessThan(now + body.lifespan + 2000);
  });

  test('Creates a transfer token with a 30-day lifespan', async () => {
    const body = {
      name: 'transfer-token_tests-lifespan30',
      description: 'transfer-token_tests-description',
      lifespan: 30 * 24 * 60 * 60 * 1000, // 30 days
      permissions: FULL_ACCESS,
    };

    const res = await rq({
      url: '/admin/transfer/tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toStrictEqual({
      accessKey: expect.any(String),
      name: body.name,
      permissions: expect.arrayContaining(body.permissions),
      description: body.description,
      id: expect.any(Number),
      createdAt: expect.toBeISODate(),
      lastUsedAt: null,
      updatedAt: expect.toBeISODate(),
      expiresAt: expect.toBeISODate(),
      lifespan: String(body.lifespan),
    });

    // Datetime stored in some databases may lose ms accuracy, so allow a range of 2 seconds for timing edge cases
    expect(Date.parse(res.body.data.expiresAt)).toBeGreaterThan(now + body.lifespan - 2000);
    expect(Date.parse(res.body.data.expiresAt)).toBeLessThan(now + body.lifespan + 2000);
  });

  test('Creates a transfer token with a 90-day lifespan', async () => {
    const body = {
      name: 'transfer-token_tests-lifespan90',
      description: 'transfer-token_tests-description',
      lifespan: 90 * 24 * 60 * 60 * 1000, // 90 days
      permissions: FULL_ACCESS,
    };

    const res = await rq({
      url: '/admin/transfer/tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toStrictEqual({
      accessKey: expect.any(String),
      name: body.name,
      permissions: expect.arrayContaining(body.permissions),
      description: body.description,
      id: expect.any(Number),
      createdAt: expect.toBeISODate(),
      lastUsedAt: null,
      updatedAt: expect.toBeISODate(),
      expiresAt: expect.toBeISODate(),
      lifespan: String(body.lifespan),
    });

    // Datetime stored in some databases may lose ms accuracy, so allow a range of 2 seconds for timing edge cases
    expect(Date.parse(res.body.data.expiresAt)).toBeGreaterThan(now + body.lifespan - 2000);
    expect(Date.parse(res.body.data.expiresAt)).toBeLessThan(now + body.lifespan + 2000);
  });

  test('Creates a transfer token with a null lifespan', async () => {
    const body = {
      name: 'transfer-token_tests-nulllifespan',
      description: 'transfer-token_tests-description',
      lifespan: null,
      permissions: FULL_ACCESS,
    };

    const res = await rq({
      url: '/admin/transfer/tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toStrictEqual({
      accessKey: expect.any(String),
      name: body.name,
      permissions: expect.arrayContaining(body.permissions),
      description: body.description,
      id: expect.any(Number),
      createdAt: expect.toBeISODate(),
      lastUsedAt: null,
      updatedAt: expect.toBeISODate(),
      expiresAt: null,
      lifespan: body.lifespan,
    });
  });

  test('Fails to create a transfer token with invalid lifespan', async () => {
    const body = {
      name: 'transfer-token_tests-lifespan',
      description: 'transfer-token_tests-description',
      lifespan: -1,
      permissions: FULL_ACCESS,
    };

    const res = await rq({
      url: '/admin/transfer/tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toStrictEqual({
      data: null,
      error: {
        status: 400,
        name: 'ValidationError',
        message: expect.stringContaining('lifespan must be one of the following values'),
        details: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining('lifespan must be one of the following values'),
              name: 'ValidationError',
            }),
          ]),
        },
      },
    });
  });

  test('Creates a transfer token without a description (successfully)', async () => {
    const body = {
      name: 'transfer-token_tests-without-description',
      permissions: FULL_ACCESS,
    };

    const res = await rq({
      url: '/admin/transfer/tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      accessKey: expect.any(String),
      name: body.name,
      permissions: expect.arrayContaining(body.permissions),
      description: '',
      id: expect.any(Number),
      createdAt: expect.any(String),
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Creates a transfer token with trimmed description and name (successfully)', async () => {
    const body = {
      name: '  transfer-token_tests-spaces-at-the-end   ',
      description: '  transfer-token_tests-description-with-spaces-at-the-end   ',
      permissions: FULL_ACCESS,
    };

    const res = await rq({
      url: '/admin/transfer/tokens',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      accessKey: expect.any(String),
      name: 'transfer-token_tests-spaces-at-the-end',
      permissions: expect.arrayContaining(body.permissions),
      description: 'transfer-token_tests-description-with-spaces-at-the-end',
      id: expect.any(Number),
      createdAt: expect.any(String),
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('List all transfer tokens (successfully)', async () => {
    await deleteAllTokens();

    // create 5 tokens
    const tokens = [];
    tokens.push(await createValidToken());
    tokens.push(await createValidToken());
    tokens.push(await createValidToken());
    tokens.push(await createValidToken({ lifespan: constants.TRANSFER_TOKEN_LIFESPANS.DAYS_7 }));
    tokens.push(await createValidToken());

    const res = await rq({
      url: '/admin/transfer/tokens',
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(tokens.length);
    // check that each token exists in data
    tokens.forEach((token) => {
      const t = res.body.data.find((t) => t.id === token.id);
      if (t.permissions) {
        t.permissions = t.permissions.sort();
        Object.assign(token, { permissions: token.permissions.sort() });
      }
      expect(t).toStrictEqual(omit(token, ['accessKey']));
    });
  });

  test('Deletes a transfer token (successfully)', async () => {
    const token = await createValidToken();

    const res = await rq({
      url: `/admin/transfer/tokens/${token.id}`,
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        name: token.name,
        description: token.description,
        id: token.id,
        createdAt: token.createdAt,
        lastUsedAt: null,
        updatedAt: expect.any(String),
        expiresAt: null,
        lifespan: null,
      })
    );
  });

  test('Does not return an error if the resource to delete does not exist', async () => {
    const res = await rq({
      url: '/admin/transfer/tokens/42',
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeNull();
  });

  test('Retrieves a transfer token (successfully)', async () => {
    const token = await createValidToken();

    const res = await rq({
      url: `/admin/transfer/tokens/${token.id}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: token.name,
      permissions: expect.arrayContaining(token.permissions),
      description: token.description,
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
      url: '/admin/transfer/tokens/42',
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      data: null,
      error: {
        status: 404,
        name: 'NotFoundError',
        message: 'Transfer token not found',
        details: {},
      },
    });
  });

  test('Updates a transfer token (successfully)', async () => {
    // create a token
    const body = {
      name: 'transfer-token_tests-name',
      description: 'transfer-token_tests-description',
    };
    const token = await createValidToken(body);

    const updatedBody = {
      name: 'transfer-token_tests-updated-name',
      description: 'transfer-token_tests-description',
      permissions: FULL_ACCESS,
    };

    const updatedRes = await rq({
      url: `/admin/transfer/tokens/${token.id}`,
      method: 'PUT',
      body: updatedBody,
    });

    expect(updatedRes.statusCode).toBe(200);
    expect(updatedRes.body.data).toMatchObject({
      name: updatedBody.name,
      permissions: expect.arrayContaining(updatedBody.permissions),
      description: updatedBody.description,
      id: token.id,
      createdAt: token.createdAt,
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Returns a 404 if the resource to update does not exist', async () => {
    await deleteAllTokens();

    const body = {
      name: 'transfer-token_tests-updated-name',
      description: 'transfer-token_tests-updated-description',
      permissions: FULL_ACCESS,
    };

    const res = await rq({
      url: '/admin/transfer/tokens/42',
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      data: null,
      error: {
        status: 404,
        name: 'NotFoundError',
        message: 'Transfer token not found',
        details: {},
      },
    });
  });

  test('Updates a transfer token with partial payload (successfully)', async () => {
    const token = await createValidToken();

    const body = {
      description: 'transfer-token_tests-re-updated-description',
    };

    const res = await rq({
      url: `/admin/transfer/tokens/${token.id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: token.name,
      permissions: expect.arrayContaining(token.permissions),
      description: body.description,
      id: token.id,
      createdAt: token.createdAt,
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Updates a transfer token when passing a `null` description (successfully)', async () => {
    const token = await createValidToken();

    const body = {
      description: null,
    };

    const res = await rq({
      url: `/admin/transfer/tokens/${token.id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: token.name,
      permissions: expect.arrayContaining(token.permissions),
      description: '',
      id: token.id,
      createdAt: token.createdAt,
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Updates a transfer token but not the description if no description is passed (successfully)', async () => {
    const token = await createValidToken();

    const body = {
      name: 'transfer-token_tests-newNameWithoutDescUpdate',
    };

    const res = await rq({
      url: `/admin/transfer/tokens/${token.id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: body.name,
      description: token.description,
      permissions: expect.arrayContaining(token.permissions),
      id: token.id,
      createdAt: token.createdAt,
      lastUsedAt: null,
      updatedAt: expect.any(String),
      expiresAt: null,
      lifespan: null,
    });
  });

  test('Regenerates an transfer token access key', async () => {
    const token = await createValidToken();

    const res = await rq({
      url: `/admin/transfer/tokens/${token.id}/regenerate`,
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
      url: `/admin/transfer/tokens/999999/regenerate`,
      method: 'POST',
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatchObject({
      name: 'NotFoundError',
      status: 404,
    });
  });
});
