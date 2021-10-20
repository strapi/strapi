'use strict';

// Helpers.
const { createAuthRequest } = require('../../../test/helpers/request');
const { createStrapiInstance, superAdmin } = require('../../../test/helpers/strapi');
const { createUtils } = require('../../../test/helpers/utils');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

let internals = {
  role: null,
};

describe('Admin Auth End to End', () => {
  let rq;
  let strapi;
  let utils;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    if (edition === 'EE') {
      internals.role = await utils.createRole({
        name: 'auth_test_role',
        description: 'Only used for auth crud test (e2e)',
      });
    } else {
      internals.role = await utils.getSuperAdminRole();
    }
  });

  afterAll(async () => {
    if (edition === 'EE') {
      await utils.deleteRolesById([internals.role.id]);
    }

    await strapi.destroy();
  });

  describe('Login', () => {
    test('Can connect successfully', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: superAdmin.loginInfo,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        token: expect.any(String),
        user: {
          firstname: expect.stringOrNull(),
          lastname: expect.stringOrNull(),
          username: expect.stringOrNull(),
          email: expect.any(String),
          isActive: expect.any(Boolean),
        },
      });
    });

    test('Fails on invalid password', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: {
          ...superAdmin.loginInfo,
          password: 'wrongPassword',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid credentials',
      });
    });

    test('Fails on invalid email', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: {
          email: 'non-existent-user@strapi.io',
          password: 'pcw123',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid credentials',
      });
    });

    test('Fails on missing credentials', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: {
          email: 'non-existent-user@strapi.io',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing credentials',
      });
    });
  });

  describe('Renew token', () => {
    test('Renew token', async () => {
      const authRes = await rq({
        url: '/admin/login',
        method: 'POST',
        body: superAdmin.loginInfo,
      });

      expect(authRes.statusCode).toBe(200);
      const { token } = authRes.body.data;

      const res = await rq({
        url: '/admin/renew-token',
        method: 'POST',
        body: {
          token,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual({
        token: expect.any(String),
      });
    });

    test('Fails on invalid token', async () => {
      const res = await rq({
        url: '/admin/renew-token',
        method: 'POST',
        body: {
          token: 'invalid-token',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid token',
      });
    });

    test('Fails on missing token', async () => {
      const res = await rq({
        url: '/admin/renew-token',
        method: 'POST',
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing token',
      });
    });
  });

  describe('GET /registration-info', () => {
    const registrationToken = 'foobar';
    let user;

    beforeAll(async () => {
      const userInfo = {
        email: 'test@strapi.io',
        firstname: 'test',
        lastname: 'strapi',
        roles: [internals.role.id],
        registrationToken,
        isActive: false,
      };

      user = await utils.createUser(userInfo);
    });

    afterAll(async () => {
      await utils.deleteUserById(user.id);
    });

    test('Returns registration info', async () => {
      const res = await rq({
        url: `/admin/registration-info?registrationToken=${registrationToken}`,
        method: 'GET',
        body: {},
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
        },
      });
    });

    test('Fails on missing registration token', async () => {
      const res = await rq({
        url: '/admin/registration-info',
        method: 'GET',
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'QueryError',
        data: {
          registrationToken: ['registrationToken is a required field'],
        },
      });
    });

    test('Fails on invalid registration token. Without too much info', async () => {
      const res = await rq({
        url: '/admin/registration-info?registrationToken=ABCD',
        method: 'GET',
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid registrationToken',
      });
    });
  });

  describe('GET /register', () => {
    let user;

    beforeEach(async () => {
      const userInfo = {
        email: 'test@strapi.io',
        firstname: 'test',
        lastname: 'strapi',
        registrationToken: 'foobar',
      };

      user = await utils.createUser(userInfo);
    });

    afterEach(async () => {
      await utils.deleteUserById(user.id);
    });

    test('Fails on missing payload', async () => {
      const res = await rq({
        url: '/admin/register',
        method: 'POST',
        body: {
          userInfo: {},
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: {
          registrationToken: ['registrationToken is a required field'],

          'userInfo.firstname': ['userInfo.firstname is a required field'],
          'userInfo.lastname': ['userInfo.lastname is a required field'],
          'userInfo.password': ['userInfo.password is a required field'],
        },
      });
    });

    test('Fails on invalid password', async () => {
      const res = await rq({
        url: '/admin/register',
        method: 'POST',
        body: {
          registrationToken: user.registrationToken,
          userInfo: {
            firstname: 'test',
            lastname: 'Strapi',
            password: '123',
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: {
          'userInfo.password': ['userInfo.password must contain at least one uppercase character'],
        },
      });
    });

    test('Registers user correctly', async () => {
      const userRegistrationInfo = {
        firstname: 'test',
        lastname: 'Strapi',
        password: '1Test2azda3',
      };

      const res = await rq({
        url: '/admin/register',
        method: 'POST',
        body: {
          registrationToken: user.registrationToken,
          userInfo: userRegistrationInfo,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        token: expect.any(String),
        user: {
          email: user.email,
          firstname: 'test',
          lastname: 'Strapi',
        },
      });

      expect(res.body.data.user.password === userRegistrationInfo.password).toBe(false);
    });
  });

  describe('GET /register-admin', () => {
    test('Fails on missing payload', async () => {
      const res = await rq({
        url: '/admin/register-admin',
        method: 'POST',
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: {
          email: ['email is a required field'],
          firstname: ['firstname is a required field'],
          lastname: ['lastname is a required field'],
          password: ['password is a required field'],
        },
      });
    });

    test('Fails on invalid password', async () => {
      const res = await rq({
        url: '/admin/register-admin',
        method: 'POST',
        body: {
          email: 'test@strapi.io',
          firstname: 'test',
          lastname: 'Strapi',
          password: '123',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: {
          password: ['password must contain at least one uppercase character'],
        },
      });
    });

    test('Fails if already a user', async () => {
      const userInfo = {
        email: 'test-admin@strapi.io',
        firstname: 'test',
        lastname: 'Strapi',
        password: '1Test2azda3',
      };

      const res = await rq({
        url: '/admin/register-admin',
        method: 'POST',
        body: userInfo,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'You cannot register a new super admin',
      });
    });
  });

  describe('POST /forgot-password', () => {
    test('Always returns en empty response', async () => {
      global.strapi.admin.services.auth.forgotPassword = jest.fn(() => {});

      const res = await rq({
        url: '/admin/forgot-password',
        method: 'POST',
        body: {
          email: 'admin@strapi.io',
        },
      });

      expect(res.statusCode).toBe(204);
      expect(res.body).toStrictEqual({});

      const nonExistentRes = await rq({
        url: '/admin/forgot-password',
        method: 'POST',
        body: {
          email: 'email-do-not-exist@strapi.io',
        },
      });

      expect(nonExistentRes.statusCode).toBe(204);
      expect(nonExistentRes.body).toStrictEqual({});
    });
  });
});
