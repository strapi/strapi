'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest } = require('api-tests/request');
const { createAuthenticatedUser } = require('../utils');

/**
 * Tests for users-permissions cookie security configuration
 * Focus: Verify that plugin::users-permissions.sessions.cookie options are respected
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

  const getSigCookie = (res, name) => {
    const setCookies = res.headers['set-cookie'] || [];
    return setCookies.find((c) => c.startsWith(`${name}.sig=`));
  };

  const getCookieHeader = (res, name) => {
    const setCookies = res.headers['set-cookie'] || [];
    return setCookies
      .map((cookie) => cookie.split(';')[0])
      .filter((cookie) => cookie.startsWith(`${name}=`) || cookie.startsWith(`${name}.sig=`))
      .join('; ');
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

  describe('sessions.cookie.maxAge', () => {
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

    test('should include Max-Age on Set-Cookie when sessions.cookie.maxAge is configured', async () => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      strapi = await createStrapiInstance({
        bypassAuth: false,
        async bootstrap({ strapi: s }) {
          s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
          s.config.set('plugin::users-permissions.sessions.httpOnly', true);
          s.config.set('plugin::users-permissions.sessions.cookie.maxAge', 120000);
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
      expect(cookie.toLowerCase()).toMatch(/max-age=120/);

      const sigCookie = getSigCookie(res, cookieName);
      expect(sigCookie).toBeDefined();
      expect(sigCookie.toLowerCase()).toMatch(/max-age=120/);
    });

    test('should not include Max-Age when sessions.cookie.maxAge is not configured', async () => {
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

      const cookie = getCookie(res, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie.toLowerCase()).not.toMatch(/max-age=/);

      const sigCookie = getSigCookie(res, cookieName);
      expect(sigCookie).toBeDefined();
      expect(sigCookie.toLowerCase()).not.toMatch(/max-age=/);
    });

    test('should include Max-Age on refresh rotation when sessions.cookie.maxAge is configured', async () => {
      originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      strapi = await createStrapiInstance({
        bypassAuth: false,
        async bootstrap({ strapi: s }) {
          s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
          s.config.set('plugin::users-permissions.sessions.httpOnly', true);
          s.config.set('plugin::users-permissions.sessions.cookie.maxAge', 120000);
        },
      });

      await createAuthenticatedUser({ strapi, userInfo: testUser });
      const rq = createRequest({ strapi }).setURLPrefix('/api/auth').asHTTPS();

      const loginRes = await rq({
        method: 'POST',
        url: '/local',
        body: { identifier: testUser.email, password: testUser.password },
      });

      expect(loginRes.statusCode).toBe(200);

      const refreshCookie = getCookie(loginRes, cookieName);
      expect(refreshCookie).toBeDefined();

      const cookieHeader = getCookieHeader(loginRes, cookieName);
      expect(cookieHeader).not.toEqual('');

      const refreshRes = await rq({
        method: 'POST',
        url: '/refresh',
        headers: { Cookie: cookieHeader },
      });

      expect(refreshRes.statusCode).toBe(200);
      expect(refreshRes.body.jwt).toEqual(expect.any(String));

      const rotatedCookie = getCookie(refreshRes, cookieName);
      expect(rotatedCookie).toBeDefined();
      expect(rotatedCookie.toLowerCase()).toMatch(/max-age=120/);

      const rotatedSigCookie = getSigCookie(refreshRes, cookieName);
      expect(rotatedSigCookie).toBeDefined();
      expect(rotatedSigCookie.toLowerCase()).toMatch(/max-age=120/);
    });
  });
});
