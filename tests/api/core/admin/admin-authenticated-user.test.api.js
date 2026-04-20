'use strict';

// Helpers.
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

describe('Authenticated User', () => {
  let rq;
  let strapi;
  let utils;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);
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

    describe('email uniqueness', () => {
      const password = 'Password123';

      const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      test('Returns 400 when email is already used by another admin', async () => {
        const suffix = uniqueSuffix();

        await utils.createUser({
          firstname: 'Uniq',
          lastname: 'UserB',
          email: `user-b-me-${suffix}@strapi.io`,
          password,
          isActive: true,
        });

        const userA = await utils.createUser({
          firstname: 'Uniq',
          lastname: 'UserA',
          email: `user-a-me-${suffix}@strapi.io`,
          password,
          isActive: true,
        });

        const rqA = createRequest({ strapi });
        await rqA.login({ email: userA.email });

        const res = await rqA.put('/admin/users/me', {
          body: {
            email: `user-b-me-${suffix}@strapi.io`,
          },
        });

        expect(res.statusCode).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {
              email: ['Email already taken'],
            },
            message: 'ValidationError',
            name: 'BadRequestError',
            status: 400,
          },
        });
      });

      test('Allows changing to an unused email', async () => {
        const suffix = uniqueSuffix();
        const userA = await utils.createUser({
          firstname: 'Uniq',
          lastname: 'UserA',
          email: `user-a-me-${suffix}@strapi.io`,
          password,
          isActive: true,
        });

        const rqA = createRequest({ strapi });
        await rqA.login({ email: userA.email });

        const newEmail = `user-a-new-${suffix}@strapi.io`;
        const res = await rqA.put('/admin/users/me', {
          body: {
            email: newEmail,
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject({
          email: newEmail,
        });
      });

      test('Allows resubmitting own current email', async () => {
        const suffix = uniqueSuffix();
        const originalEmail = `user-a-resubmit-${suffix}@strapi.io`;

        await utils.createUser({
          firstname: 'Uniq',
          lastname: 'UserA',
          email: originalEmail,
          password,
          isActive: true,
        });

        const rqA = createRequest({ strapi });
        await rqA.login({ email: originalEmail });

        const res = await rqA.put('/admin/users/me', {
          body: {
            email: originalEmail,
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.email).toBe(originalEmail);
      });

      test('Allows profile updates without changing email', async () => {
        const suffix = uniqueSuffix();
        const stableEmail = `user-a-firstname-${suffix}@strapi.io`;

        await utils.createUser({
          firstname: 'Before',
          lastname: 'UserA',
          email: stableEmail,
          password,
          isActive: true,
        });

        const rqA = createRequest({ strapi });
        await rqA.login({ email: stableEmail });

        const res = await rqA.put('/admin/users/me', {
          body: {
            firstname: 'EmailUniquenessFirst',
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject({
          firstname: 'EmailUniquenessFirst',
          email: stableEmail,
        });
      });

      test('Allows updating own email using different casing (persisted canonical lowercase)', async () => {
        const suffix = uniqueSuffix();
        const canonical = `own-canonical-${suffix}@strapi.io`;

        await utils.createUser({
          firstname: 'Own',
          lastname: 'Case',
          email: canonical,
          password,
          isActive: true,
        });

        const rqMe = createRequest({ strapi });
        await rqMe.login({ email: canonical });

        const res = await rqMe.put('/admin/users/me', {
          body: {
            email: `OWN-CANONICAL-${suffix}@STRAPI.IO`,
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.email).toBe(canonical);
      });

      test('Applies Yup transforms together (email lowercase + firstname trim)', async () => {
        const suffix = uniqueSuffix();
        const initialEmail = `combo-a-${suffix}@strapi.io`;
        const nextEmail = `combo-b-${suffix}@strapi.io`;

        await utils.createUser({
          firstname: 'Before',
          lastname: 'Name',
          email: initialEmail,
          password,
          isActive: true,
        });

        const rqCombo = createRequest({ strapi });
        await rqCombo.login({ email: initialEmail });

        const res = await rqCombo.put('/admin/users/me', {
          body: {
            email: `COMBO-B-${suffix}@STRAPI.IO`,
            firstname: '  spaced  ',
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.email).toBe(nextEmail);
        expect(res.body.data.firstname).toBe('spaced');
      });

      test('Returns validation error for malformed email before duplicate-email logic', async () => {
        const suffix = uniqueSuffix();

        await utils.createUser({
          firstname: 'Bad',
          lastname: 'Email',
          email: `bad-email-${suffix}@strapi.io`,
          password,
          isActive: true,
        });

        const rqBad = createRequest({ strapi });
        await rqBad.login({ email: `bad-email-${suffix}@strapi.io` });

        const res = await rqBad.put('/admin/users/me', {
          body: {
            email: 'not-a-valid-email-address',
          },
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.error.name).toBe('ValidationError');
      });

      test('Treats duplicate email as taken when casing differs (yup normalizes email)', async () => {
        const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const canonicalEmail = `case-b-${suffix}@strapi.io`;

        await utils.createUser({
          firstname: 'Case',
          lastname: 'B',
          email: canonicalEmail,
          password,
          isActive: true,
        });

        const userA = await utils.createUser({
          firstname: 'Case',
          lastname: 'A',
          email: `case-a-${suffix}@strapi.io`,
          password,
          isActive: true,
        });

        const rqLocal = createRequest({ strapi });
        await rqLocal.login({ email: userA.email });

        const res = await rqLocal.put('/admin/users/me', {
          body: {
            email: `CASE-B-${suffix}@STRAPI.IO`,
          },
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.error.details.email).toEqual(['Email already taken']);
      });

      test('Reports email taken when password is valid but email belongs to another admin', async () => {
        const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const other = await utils.createUser({
          firstname: 'Pwd',
          lastname: 'Other',
          email: `pwd-other-${suffix}@strapi.io`,
          password,
          isActive: true,
        });

        const self = await utils.createUser({
          firstname: 'Pwd',
          lastname: 'Self',
          email: `pwd-self-${suffix}@strapi.io`,
          password,
          isActive: true,
        });

        const rqLocal = createRequest({ strapi });
        await rqLocal.login({ email: self.email });

        const res = await rqLocal.put('/admin/users/me', {
          body: {
            currentPassword: password,
            password: 'NewPassword456',
            email: other.email,
          },
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.error.details.email).toEqual(['Email already taken']);
      });

      test('Invalid currentPassword is returned before duplicate email checks', async () => {
        const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const other = await utils.createUser({
          firstname: 'Pwd',
          lastname: 'Other2',
          email: `pwd2-other-${suffix}@strapi.io`,
          password,
          isActive: true,
        });

        const self = await utils.createUser({
          firstname: 'Pwd',
          lastname: 'Self2',
          email: `pwd2-self-${suffix}@strapi.io`,
          password,
          isActive: true,
        });

        const rqLocal = createRequest({ strapi });
        await rqLocal.login({ email: self.email });

        const res = await rqLocal.put('/admin/users/me', {
          body: {
            currentPassword: 'wrongPassword123',
            password: 'NewPassword456',
            email: other.email,
          },
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.error.details.currentPassword).toEqual(['Invalid credentials']);
      });
    });
  });
});
