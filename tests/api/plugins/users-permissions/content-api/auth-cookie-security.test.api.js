'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest } = require('api-tests/request');
const { createAuthenticatedUser } = require('../utils');

/**
 * Tests for users-permissions cookie security configuration
 * Focus: Verify that plugin::users-permissions.sessions.cookie.secure config is respected with proper defaults
 */
describe('Users-Permissions Cookie Security', () => {
  const cookieName = 'strapi_up_refresh';

  const testUser = {
    username: 'test-cookie-security',
    email: 'test-cookie-security@strapi.io',
    password: 'TestSecure1234!',
    confirmed: true,
    provider: 'local',
  };

  const getCookie = (res, name) => {
    const setCookies = res.headers['set-cookie'] || [];
    return setCookies.find((c) => c.startsWith(`${name}=`));
  };

  describe('Default behavior based on NODE_ENV', () => {
    let strapi;
    let originalEnv;

    afterEach(async () => {
      if (strapi) {
        await strapi.db.query('plugin::users-permissions.user').deleteMany();
        await strapi.destroy();
        strapi = null;
      }
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('should set secure=true cookie in production by default (with httpOnly enabled)', async () => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      strapi = await createStrapiInstance({
        bypassAuth: false,
        async bootstrap({ strapi: s }) {
          s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
          s.config.set('plugin::users-permissions.sessions.httpOnly', true);
        },
      });

      await createAuthenticatedUser({ strapi, userInfo: testUser });
      const rq = createRequest({ strapi }).setURLPrefix('/api/auth').asHTTPS();

      const res = await rq({
        method: 'POST',
        url: '/local',
        body: { identifier: testUser.email, password: testUser.password },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.jwt).toEqual(expect.any(String));

      const cookie = getCookie(res, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie.toLowerCase()).toMatch(/secure/);
      expect(cookie.toLowerCase()).toMatch(/httponly/);
    });

    test('should set secure=false cookie in development by default (with httpOnly enabled)', async () => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      strapi = await createStrapiInstance({
        bypassAuth: false,
        async bootstrap({ strapi: s }) {
          s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
          s.config.set('plugin::users-permissions.sessions.httpOnly', true);
        },
      });

      await createAuthenticatedUser({ strapi, userInfo: testUser });
      const rq = createRequest({ strapi }).setURLPrefix('/api/auth').asHTTPS();

      const res = await rq({
        method: 'POST',
        url: '/local',
        body: { identifier: testUser.email, password: testUser.password },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.jwt).toEqual(expect.any(String));

      const cookie = getCookie(res, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie.toLowerCase()).not.toMatch(/secure/);
      expect(cookie.toLowerCase()).toMatch(/httponly/);
    });
  });

  describe('Explicit config overrides', () => {
    let strapi;
    let originalEnv;

    afterEach(async () => {
      if (strapi) {
        await strapi.db.query('plugin::users-permissions.user').deleteMany();
        await strapi.destroy();
        strapi = null;
      }
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('should respect sessions.cookie.secure: true in development', async () => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      strapi = await createStrapiInstance({
        bypassAuth: false,
        async bootstrap({ strapi: s }) {
          s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
          s.config.set('plugin::users-permissions.sessions.httpOnly', true);
          s.config.set('plugin::users-permissions.sessions.cookie.secure', true);
        },
      });

      await createAuthenticatedUser({ strapi, userInfo: testUser });
      const rq = createRequest({ strapi }).setURLPrefix('/api/auth').asHTTPS();

      const res = await rq({
        method: 'POST',
        url: '/local',
        body: { identifier: testUser.email, password: testUser.password },
      });

      expect(res.statusCode).toBe(200);

      const cookie = getCookie(res, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie.toLowerCase()).toMatch(/secure/);
    });

    test('should respect sessions.cookie.secure: false in production', async () => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      strapi = await createStrapiInstance({
        bypassAuth: false,
        async bootstrap({ strapi: s }) {
          s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
          s.config.set('plugin::users-permissions.sessions.httpOnly', true);
          s.config.set('plugin::users-permissions.sessions.cookie.secure', false);
        },
      });

      await createAuthenticatedUser({ strapi, userInfo: testUser });
      const rq = createRequest({ strapi }).setURLPrefix('/api/auth').asHTTPS();

      const res = await rq({
        method: 'POST',
        url: '/local',
        body: { identifier: testUser.email, password: testUser.password },
      });

      expect(res.statusCode).toBe(200);

      const cookie = getCookie(res, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie.toLowerCase()).not.toMatch(/secure/);
    });
  });
});
