'use strict';

// Helpers.
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createRequest } = require('api-tests/request');

describe('Authenticated User', () => {
  let rq;
  let strapi;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('GET /users/me', () => {
    test('Returns sanitized user info', async () => {
      const res = await rq({
        url: '/admin/users/me',
        method: 'GET',
        body: {},
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        id: expect.anything(),
        firstname: expect.stringOrNull(),
        lastname: expect.stringOrNull(),
        username: expect.stringOrNull(),
        email: expect.any(String),
        isActive: expect.any(Boolean),
      });
    });

    test('Returns forbidden on unauthenticated query', async () => {
      const req = createRequest({ strapi });
      const res = await req({
        url: '/admin/users/me',
        method: 'GET',
        body: {},
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /users/me', () => {
    test('Returns forbidden on unauthenticated query', async () => {
      const req = createRequest({ strapi });
      const res = await req({
        url: '/admin/users/me',
        method: 'PUT',
        body: {},
      });

      expect(res.statusCode).toBe(401);
    });

    test('Fails when trying to edit roles', async () => {
      const res = await rq({
        url: '/admin/users/me',
        method: 'PUT',
        body: {
          roles: [1],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        error: {
          details: {
            errors: [
              {
                message: 'this field has unspecified keys: roles',
                name: 'ValidationError',
                path: [],
              },
            ],
          },
          message: 'this field has unspecified keys: roles',
          name: 'ValidationError',
          status: 400,
        },
      });
    });

    test('Fails when trying to edit isActive', async () => {
      const res = await rq({
        url: '/admin/users/me',
        method: 'PUT',
        body: {
          isActive: 12,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        error: {
          details: {
            errors: [
              {
                message: 'this field has unspecified keys: isActive',
                name: 'ValidationError',
                path: [],
              },
            ],
          },
          message: 'this field has unspecified keys: isActive',
          name: 'ValidationError',
          status: 400,
        },
      });
    });

    test('Fails when trying to set invalid inputs', async () => {
      const res = await rq({
        url: '/admin/users/me',
        method: 'PUT',
        body: {
          isActive: 12,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        error: {
          details: {
            errors: [
              {
                message: 'this field has unspecified keys: isActive',
                name: 'ValidationError',
                path: [],
              },
            ],
          },
          message: 'this field has unspecified keys: isActive',
          name: 'ValidationError',
          status: 400,
        },
      });
    });

    test('Allows edition of names', async () => {
      const input = {
        firstname: 'newFirstName',
        lastname: 'newLastaName',
      };

      const res = await rq({
        url: '/admin/users/me',
        method: 'PUT',
        body: input,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        id: expect.anything(),
        email: expect.any(String),
        firstname: input.firstname,
        lastname: input.lastname,
        username: expect.stringOrNull(),
        isActive: expect.any(Boolean),
      });
    });

    test('Updating password requires currentPassword', async () => {
      const input = {
        password: 'newPassword1234',
      };

      const res = await rq({
        url: '/admin/users/me',
        method: 'PUT',
        body: input,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'currentPassword is a required field',
          details: {
            errors: [
              {
                message: 'currentPassword is a required field',
                name: 'ValidationError',
                path: ['currentPassword'],
              },
            ],
          },
        },
      });
    });

    test('Updating password requires currentPassword to be valid', async () => {
      const input = {
        password: 'newPassword1234',
        currentPassword: 'wrongPass',
      };

      const res = await rq({
        url: '/admin/users/me',
        method: 'PUT',
        body: input,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          details: {
            currentPassword: ['Invalid credentials'],
          },
          message: 'ValidationError',
          name: 'BadRequestError',
          status: 400,
        },
      });
    });
  });
});
