'use strict';

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createRequest } = require('../../../../../test/helpers/request');
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

    rq = createRequest({ strapi })
      .setURLPrefix('/api/auth')
      .setToken(jwt);
  });

  afterAll(async () => {
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
    });

    test('Fails on invalid confirmation password', async () => {
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
  });
});
