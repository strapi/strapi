'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import jwt from 'jsonwebtoken';

/**
 * Tests for session based admin authentication
 * Focus: login/register issuing refresh cookie + access/refresh in body, and access-token exchange.
 */
describe('Admin Sessions Auth', () => {
  let strapi: any;
  let rq: any;
  let utils: any;

  const cookieName = 'strapi_admin_refresh';

  beforeAll(async () => {
    strapi = await createStrapiInstance();

    rq = createRequest({ strapi });
    utils = createUtils(strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  const getCookie = (res: any, name: string): string | undefined => {
    const setCookies: string[] = res.headers['set-cookie'] || [];
    return setCookies.find((c) => c.startsWith(`${name}=`));
  };

  const decode = (token: string): any => {
    const secret = strapi.config.get('admin.auth.secret');
    return jwt.verify(token, secret);
  };

  describe('POST /admin/login (sessions enabled)', () => {
    const deviceId = '11111111-1111-4111-8111-111111111111';
    it('returns access token as primary token, also accessToken; sets refresh cookie (rememberMe=true)', async () => {
      const body = {
        email: superAdmin.loginInfo.email,
        password: superAdmin.loginInfo.password,
        deviceId,
        rememberMe: true,
      };

      const res = await rq.post('/admin/login', { body });

      expect(res.statusCode).toBe(200);

      // Primary token should be access token when sessions are enabled
      expect(res.body.data.token).toEqual(expect.any(String));
      expect(res.body.data.accessToken).toEqual(expect.any(String));

      // refreshToken should not be in response body, only in cookie
      expect(res.body.data.refreshToken).toBeUndefined();

      // Cookie assertions
      const cookie = getCookie(res, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/httponly/i);
      expect(cookie).toMatch(/path=\/admin/i);

      // rememberMe=true should set an Expires
      expect(cookie).toMatch(/expires=/i);

      // Extract refresh token from cookie
      const refreshToken = cookie!.split(';')[0].split('=')[1];

      // Decode and validate tokens
      const accessPayload = decode(res.body.data.accessToken);
      expect(accessPayload).toMatchObject({
        type: 'access',
        userId: expect.any(String),
        sessionId: expect.any(String),
      });

      const refreshPayload = decode(refreshToken);
      expect(refreshPayload).toMatchObject({
        type: 'refresh',
        userId: accessPayload.userId,
        sessionId: accessPayload.sessionId,
      });

      // Session exists in DB
      const session = await strapi.db
        .query('admin::session')
        .findOne({ where: { sessionId: refreshPayload.sessionId } });

      expect(session).toBeTruthy();
      expect(session.userId).toBe(String(accessPayload.userId));
      expect(session.origin).toBe('admin');
      expect(session.deviceId).toBe(body.deviceId);
    });

    it('sets session cookie (no Expires) when rememberMe is false', async () => {
      const res = await rq.post('/admin/login', {
        body: {
          email: superAdmin.loginInfo.email,
          password: superAdmin.loginInfo.password,
          rememberMe: false,
        },
      });

      expect(res.statusCode).toBe(200);

      const cookie = getCookie(res, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie).not.toMatch(/Expires=/); // session cookie (no explicit Expires)
    });
  });

  describe('POST /admin/access-token', () => {
    it('exchanges refresh cookie for a new access token', async () => {
      // First login and capture refresh cookie
      const loginRes = await rq.post('/admin/login', { body: superAdmin.loginInfo });
      expect(loginRes.statusCode).toBe(200);

      const refreshSetCookie = getCookie(loginRes, cookieName);
      expect(refreshSetCookie).toBeDefined();

      // Forward cookie header explicitly to ensure the exchange gets the refresh token.
      const cookiePair = refreshSetCookie!.split(';')[0];
      const res = await createRequest({ strapi }).post('/admin/access-token', {
        headers: { Cookie: cookiePair },
      });
      expect(res.statusCode).toBe(200);

      const token = res.body?.data?.token;
      expect(token).toEqual(expect.any(String));

      const payload = decode(token);
      expect(payload).toMatchObject({
        type: 'access',
        userId: expect.any(String),
        sessionId: expect.any(String),
      });
    });

    it('returns 401 when refresh cookie is missing', async () => {
      const freshRq = createRequest({ strapi });
      const res = await freshRq.post('/admin/access-token');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Session Invalidation on User Operations', () => {
    let testUser: any;
    let superAdminToken: string;

    beforeAll(async () => {
      // Login as super admin to perform user operations
      const loginRes = await rq.post('/admin/login', { body: superAdmin.loginInfo });
      superAdminToken = loginRes.body.data.token;
    });

    beforeEach(async () => {
      // Create a test user using utils (proper way)
      testUser = await utils.createUser({
        email: 'testuser@example.com',
        firstname: 'Test',
        lastname: 'User',
        password: 'TestPass123',
      });
    });

    afterEach(async () => {
      // Cleanup: delete test user if it still exists
      if (testUser) {
        try {
          await utils.deleteUserById(testUser.id);
        } catch (e) {
          // User might already be deleted in test
        }
      }
    });

    it('invalidates all sessions when user is deleted', async () => {
      // Login as test user to create sessions
      const loginRes1 = await rq.post('/admin/login', {
        body: {
          email: 'testuser@example.com',
          password: 'TestPass123',
        },
      });
      expect(loginRes1.statusCode).toBe(200);

      const userToken = loginRes1.body.data.token;

      // Verify user session is active
      const profileRes = await rq.get('/admin/users/me', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(profileRes.statusCode).toBe(200);

      // Delete the user (should invalidate all sessions)
      await utils.deleteUserById(testUser.id);

      // Try to use the user's token - should be invalid now
      const invalidProfileRes = await rq.get('/admin/users/me', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(invalidProfileRes.statusCode).toBe(401);

      testUser = null; // Prevent cleanup attempt
    });

    it('bulk user deletion invalidates all affected user sessions', async () => {
      // Create another test user using utils
      const testUser2 = await utils.createUser({
        email: 'testuser2@example.com',
        firstname: 'Test2',
        lastname: 'User2',
        password: 'TestPass123',
      });

      // Login as both users
      const loginRes1 = await rq.post('/admin/login', {
        body: { email: 'testuser@example.com', password: 'TestPass123' },
      });
      const loginRes2 = await rq.post('/admin/login', {
        body: { email: 'testuser2@example.com', password: 'TestPass123' },
      });

      const token1 = loginRes1.body.data.token;
      const token2 = loginRes2.body.data.token;

      // Verify both sessions work
      expect(
        (await rq.get('/admin/users/me', { headers: { Authorization: `Bearer ${token1}` } }))
          .statusCode
      ).toBe(200);
      expect(
        (await rq.get('/admin/users/me', { headers: { Authorization: `Bearer ${token2}` } }))
          .statusCode
      ).toBe(200);

      // Bulk delete users using utils
      await utils.deleteUsersById([testUser.id, testUser2.id]);

      // Both tokens should now be invalid
      expect(
        (await rq.get('/admin/users/me', { headers: { Authorization: `Bearer ${token1}` } }))
          .statusCode
      ).toBe(401);
      expect(
        (await rq.get('/admin/users/me', { headers: { Authorization: `Bearer ${token2}` } }))
          .statusCode
      ).toBe(401);
    });
  });
});
