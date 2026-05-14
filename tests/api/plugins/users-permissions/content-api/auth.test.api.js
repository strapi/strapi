'use strict';

const bcrypt = require('bcryptjs');

const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest } = require('api-tests/request');
const { createAuthenticatedUser } = require('../utils');

let strapi;
let rq;

const internals = {
  user: {
    username: 'test',
    email: 'test@strapi.io',
    password: 'Test1234',
    confirmed: true,
    provider: 'local',
  },
  newPassword: 'Test12345',
};

const data = {};

describe('Auth API', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance({ bypassAuth: false });

    const { jwt, user } = await createAuthenticatedUser({ strapi, userInfo: internals.user });

    data.user = user;

    rq = createRequest({ strapi }).setURLPrefix('/api/auth').setToken(jwt);
  });

  afterAll(async () => {
    await strapi.db.query('plugin::users-permissions.user').deleteMany();
    await strapi.destroy();
  });

  describe('Change Password', () => {
    test('Fails on unauthenticated request', async () => {
      const nonAuthRequest = createRequest({ strapi });

      const res = await nonAuthRequest({
        method: 'POST',
        url: '/api/auth/change-password',
        body: {},
      });

      expect(res.statusCode).toBe(403);
      expect(res.body.error.name).toBe('ForbiddenError');
      expect(res.body.error.message).toBe('Forbidden');
    });

    test('Fails on invalid confirm password', async () => {
      const res = await rq({
        method: 'POST',
        url: '/change-password',
        body: {
          password: 'newPassword',
          passwordConfirmation: 'somethingElse',
          currentPassword: internals.user.password,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
      expect(res.body.error.message).toBe('Passwords do not match');
    });

    test('Fails on invalid current password', async () => {
      const res = await rq({
        method: 'POST',
        url: '/change-password',
        body: {
          password: 'newPassword',
          passwordConfirmation: 'newPassword',
          currentPassword: 'badPassword',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
      expect(res.body.error.message).toBe('The provided current password is invalid');
    });

    test('Fails when current and new password are the same', async () => {
      const res = await rq({
        method: 'POST',
        url: '/change-password',
        body: {
          password: internals.user.password,
          passwordConfirmation: internals.user.password,
          currentPassword: internals.user.password,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
      expect(res.body.error.message).toBe(
        'Your new password must be different than your current password'
      );
    });

    test('Returns user info and jwt token on success', async () => {
      const res = await rq({
        method: 'POST',
        url: '/change-password',
        body: {
          password: internals.newPassword,
          passwordConfirmation: internals.newPassword,
          currentPassword: internals.user.password,
        },
      });

      // check that password was hashed
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: {
          email: internals.user.email.toLowerCase(),
        },
      });
      expect(bcrypt.compareSync(internals.newPassword, user.password)).toBe(true);

      // check results
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        jwt: expect.any(String),
        user: {
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
        },
      });
    });

    test('Can login with new password after success', async () => {
      const rq = createRequest({ strapi }).setURLPrefix('/api/auth');

      const res = await rq({
        method: 'POST',
        url: '/local',
        body: {
          identifier: internals.user.email,
          password: internals.newPassword,
        },
      });

      expect(res.statusCode).toBe(200);
    });

    const cases = [
      {
        description: 'Password is exactly 73 bytes with valid ASCII characters',
        password: `a${'b'.repeat(100)}`, // 1 byte ('a') + 72 bytes ('b') = 73 bytes
        expectedStatus: 400,
        expectedMessage: 'Password must be less than 73 bytes',
      },
      {
        description: 'Password is 73 bytes but contains a character cut in half (UTF-8)',
        password: `a${'b'.repeat(100)}\uD83D`, // 1 byte ('a') + 70 bytes ('b') + 3 bytes for half of a surrogate pair
        expectedStatus: 400,
        expectedMessage: 'Password must be less than 73 bytes',
      },
    ];

    test.each(cases)('$description', async ({ password, expectedStatus, expectedMessage }) => {
      const res = await rq({
        method: 'POST',
        url: '/change-password',
        body: {
          password,
          passwordConfirmation: password,
          currentPassword: internals.newPassword,
        },
      });

      expect(res.statusCode).toBe(expectedStatus);
      expect(res.body.error.name).toBe('ValidationError');
      expect(res.body.error.message).toBe(expectedMessage);
    });
  });

  test('Can login with password that previously validated but is now too long', async () => {
    const longPassword = 'a'.repeat(100);
    const userInfo = {
      username: 'longPasswordUser',
      email: 'longpassworduser@strapi.io',
      password: longPassword,
      confirmed: true,
      provider: 'local',
    };

    const { user } = await createAuthenticatedUser({ strapi, userInfo });

    const rq = createRequest({ strapi }).setURLPrefix('/api/auth');

    const res = await rq({
      method: 'POST',
      url: '/local',
      body: {
        identifier: user.email,
        password: longPassword,
      },
    });

    expect(res.statusCode).toBe(200);
  });
});
