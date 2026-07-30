'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';
import jwt from 'jsonwebtoken';

describe('Legacy Token Migration on Version Update', () => {
  let strapi: any;
  let rq: any;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = createRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  const createLegacyToken = (payload: any = {}): string => {
    const secret = strapi.config.get('admin.auth.secret');
    const defaultPayload = {
      userId: 1,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      ...payload,
    };
    return jwt.sign(defaultPayload, secret);
  };

  describe('Legacy JWT rejection', () => {
    it('should reject old-format JWT tokens without type field', async () => {
      const legacyToken = createLegacyToken(); // No 'type' field

      const res = await rq.setToken(legacyToken).get('/admin/users/me');
      expect(res.statusCode).toBe(401);
    });

    it('should reject tokens with invalid type field', async () => {
      const invalidToken = createLegacyToken({ type: 'legacy' });

      const res = await rq.setToken(invalidToken).get('/admin/users/me');
      expect(res.statusCode).toBe(401);
    });

    it('should reject tokens with wrong type (refresh used as access)', async () => {
      const refreshTypeToken = createLegacyToken({ type: 'refresh' });

      const res = await rq.setToken(refreshTypeToken).get('/admin/users/me');
      expect(res.statusCode).toBe(401);
    });

    it('should reject malformed tokens', async () => {
      const malformedToken = 'invalid.jwt.token';

      const res = await rq.setToken(malformedToken).get('/admin/users/me');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Simulated post-upgrade authentication flow', () => {
    it('should force re-authentication after upgrade simulation', async () => {
      // Simulate legacy token stored in client
      const legacyToken = createLegacyToken({ userId: 1 });

      // Legacy token should be rejected
      const legacyRes = await rq.setToken(legacyToken).get('/admin/users/me');
      expect(legacyRes.statusCode).toBe(401);

      // Fresh login should work with new session system
      const loginRes = await rq.post('/admin/login', {
        body: superAdmin.loginInfo,
      });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.data.token).toBeDefined(); // New access token
      expect(loginRes.headers['set-cookie']).toBeDefined(); // Refresh cookie

      // New token should work for API calls
      const newRes = await rq.setToken(loginRes.body.data.accessToken).get('/admin/users/me');
      expect(newRes.statusCode).toBe(200);
    });

    it('should maintain session persistence across requests', async () => {
      const loginRes = await rq.post('/admin/login', {
        body: { ...superAdmin.loginInfo, rememberMe: true },
      });

      const accessToken = loginRes.body.data.accessToken;
      const cookieHeader = loginRes.headers['set-cookie'][0];

      // Multiple API calls should work
      const res1 = await rq.setToken(accessToken).get('/admin/users/me');
      const res2 = await rq.setToken(accessToken).get('/admin/roles');

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);

      // Token exchange should work with refresh cookie
      const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
        headers: { Cookie: cookieHeader },
      });

      expect(tokenRes.statusCode).toBe(200);
      expect(tokenRes.body.data.token).toBeDefined();
    });
  });

  describe('Malformed tokens', () => {
    it('should handle expired legacy tokens gracefully', async () => {
      const expiredToken = createLegacyToken({
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      });

      const res = await rq.setToken(expiredToken).get('/admin/users/me');
      expect(res.statusCode).toBe(401);
    });

    it('should handle tokens with missing required fields', async () => {
      const incompleteToken = createLegacyToken({ userId: undefined });

      const res = await rq.setToken(incompleteToken).get('/admin/users/me');
      expect(res.statusCode).toBe(401);
    });

    it('should reject tokens signed with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { userId: 1, type: 'access', exp: Math.floor(Date.now() / 1000) + 3600 },
        'wrong-secret'
      );

      const res = await rq.setToken(wrongSecretToken).get('/admin/users/me');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Session table validation', () => {
    it('should validate access tokens against active sessions', async () => {
      // Login and get tokens
      const loginRes = await rq.post('/admin/login', {
        body: superAdmin.loginInfo,
      });
      const accessToken = loginRes.body.data.accessToken;

      // Decode to get sessionId
      const secret = strapi.config.get('admin.auth.secret');
      const decoded = jwt.verify(accessToken, secret) as any;
      const sessionId = decoded.sessionId;

      // Verify session exists in database
      const session = await strapi.db.query('admin::session').findOne({ where: { sessionId } });
      expect(session).toBeTruthy();
      expect(session.status).toBe('active');

      // Delete session from database
      await strapi.db.query('admin::session').delete({ where: { sessionId } });

      // Access token should now be invalid
      const res = await rq.setToken(accessToken).get('/admin/users/me');
      expect(res.statusCode).toBe(401);
    });

    it('should reject tokens with non-existent sessionId', async () => {
      // Create valid JWT but with fake sessionId
      const secret = strapi.config.get('admin.auth.secret');
      const fakeToken = jwt.sign(
        {
          userId: '1',
          sessionId: 'non-existent-session-id',
          type: 'access',
        },
        secret,
        { expiresIn: '1h' }
      );

      const res = await rq.setToken(fakeToken).get('/admin/users/me');
      expect(res.statusCode).toBe(401);
    });
  });
});
