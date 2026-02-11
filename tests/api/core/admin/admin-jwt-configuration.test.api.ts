'use strict';

import { createAuthRequest } from 'api-tests/request';
import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createUtils } from 'api-tests/utils';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Generate test RSA key pair
const generateRSAKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  return { publicKey, privateKey };
};

const { publicKey: testPublicKey, privateKey: testPrivateKey } = generateRSAKeyPair();

describe('Admin JWT Configuration API Tests', () => {
  let rq: any;
  let strapi: any;
  let utils: any;

  afterEach(async () => {
    if (strapi) {
      await strapi.destroy();
      strapi = null;
      rq = null;
      utils = null;
    }
  });

  describe('Default JWT Configuration', () => {
    beforeEach(async () => {
      strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.rateLimit.enabled', false);
        },
      });
      rq = await createAuthRequest({ strapi });
      utils = createUtils(strapi);
    });

    test('Uses default HS256 algorithm when no configuration is provided', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: superAdmin.loginInfo,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();

      // Decode the JWT to verify algorithm
      const token = res.body.data.token;
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded?.header.alg).toBe('HS256');
      expect(decoded?.header.typ).toBe('JWT');
    });
  });

  describe('Legacy admin.auth.options Configuration', () => {
    beforeEach(async () => {
      strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.rateLimit.enabled', false);
          s.config.set('admin.auth.options', {
            algorithm: 'HS512',
            issuer: 'legacy-test-issuer',
            audience: 'legacy-test-audience',
          });
        },
      });
      rq = await createAuthRequest({ strapi });
      utils = createUtils(strapi);
    });

    test('Uses legacy admin.auth.options configuration', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: superAdmin.loginInfo,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();

      // Decode the JWT to verify configuration
      const token = res.body.data.token;
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded?.header.alg).toBe('HS512');
      expect(decoded?.payload.iss).toBe('legacy-test-issuer');
      expect(decoded?.payload.aud).toBe('legacy-test-audience');
    });
  });

  describe('New admin.auth.sessions.options Configuration', () => {
    beforeEach(async () => {
      strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.rateLimit.enabled', false);
          s.config.set('admin.auth.sessions.options', {
            algorithm: 'HS384',
            issuer: 'sessions-test-issuer',
            audience: 'sessions-test-audience',
            subject: 'sessions-test-subject',
          });
        },
      });
      rq = await createAuthRequest({ strapi });
      utils = createUtils(strapi);
    });

    test('Uses new admin.auth.sessions.options configuration', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: superAdmin.loginInfo,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();

      // Decode the JWT to verify configuration
      const token = res.body.data.token;
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded?.header.alg).toBe('HS384');
      expect(decoded?.payload.iss).toBe('sessions-test-issuer');
      expect(decoded?.payload.aud).toBe('sessions-test-audience');
      expect(decoded?.payload.sub).toBe('sessions-test-subject');
    });
  });

  describe('Configuration Priority: sessions.options over auth.options', () => {
    beforeEach(async () => {
      strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.rateLimit.enabled', false);
          // Set legacy options
          s.config.set('admin.auth.options', {
            algorithm: 'HS256',
            issuer: 'legacy-issuer',
            audience: 'legacy-audience',
          });
          // Set new options (should take priority)
          s.config.set('admin.auth.sessions.options', {
            algorithm: 'HS512',
            issuer: 'sessions-issuer',
            audience: 'sessions-audience',
            subject: 'sessions-subject',
          });
        },
      });
      rq = await createAuthRequest({ strapi });
      utils = createUtils(strapi);
    });

    test('sessions.options takes priority over legacy auth.options', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: superAdmin.loginInfo,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();

      // Decode the JWT to verify sessions.options takes priority
      const token = res.body.data.token;
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded?.header.alg).toBe('HS512'); // From sessions.options
      expect(decoded?.payload.iss).toBe('sessions-issuer'); // From sessions.options
      expect(decoded?.payload.aud).toBe('sessions-audience'); // From sessions.options
      expect(decoded?.payload.sub).toBe('sessions-subject'); // From sessions.options
    });
  });

  describe('Asymmetric Algorithm Configuration (RS256)', () => {
    beforeEach(async () => {
      strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.rateLimit.enabled', false);
          s.config.set('admin.auth.sessions.options', {
            algorithm: 'RS256',
            privateKey: testPrivateKey,
            publicKey: testPublicKey,
            issuer: 'rsa-test-issuer',
            audience: 'rsa-test-audience',
          });
        },
      });
      rq = await createAuthRequest({ strapi });
      utils = createUtils(strapi);
    });

    test('Uses RS256 algorithm with RSA key pair', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: superAdmin.loginInfo,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();

      // Decode the JWT to verify configuration
      const token = res.body.data.token;
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded?.header.alg).toBe('RS256');
      expect(decoded?.payload.iss).toBe('rsa-test-issuer');
      expect(decoded?.payload.aud).toBe('rsa-test-audience');

      // Verify the token can be verified with the public key
      const verified = jwt.verify(token, testPublicKey, {
        algorithms: ['RS256'],
        issuer: 'rsa-test-issuer',
        audience: 'rsa-test-audience',
      });

      expect(verified).toBeDefined();
      expect(verified.type).toBe('access');
    });

    test('Access token can be used for authenticated requests', async () => {
      // First login to get token
      const loginRes = await rq({
        url: '/admin/login',
        method: 'POST',
        body: superAdmin.loginInfo,
      });

      expect(loginRes.statusCode).toBe(200);
      const token = loginRes.body.data.token;

      // Use token for authenticated request
      const authRes = await rq({
        url: '/admin/users/me',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(authRes.statusCode).toBe(200);
      expect(authRes.body.data).toBeDefined();
    });
  });

  describe('Legacy expiresIn deprecation warning', () => {
    test('Logs deprecation warning when legacy admin.auth.options.expiresIn is used without new session config', async () => {
      const warnSpy = jest.fn();
      strapi = await createStrapiInstance({
        skipDefaultSessionConfig: true,
        async bootstrap({ strapi: s }) {
          s.config.set('admin.rateLimit.enabled', false);
          s.config.set('admin.auth.options', { expiresIn: '7d' });
          const originalWarn = s.log.warn.bind(s.log);
          s.log.warn = (...args: unknown[]) => {
            warnSpy(...args);
            originalWarn(...args);
          };
          (s as any).__expiresInDeprecationWarnSpy = warnSpy;
        },
      });
      rq = await createAuthRequest({ strapi });
      const deprecationMessage =
        'admin.auth.options.expiresIn is deprecated and will be removed in Strapi 6. Please configure admin.auth.sessions.maxRefreshTokenLifespan and admin.auth.sessions.maxSessionLifespan.';
      expect(warnSpy).toHaveBeenCalledWith(deprecationMessage);
    });
  });

  describe('Legacy expiresIn still applies to session lifespans', () => {
    test('Refresh token and cookie expiry use legacy admin.auth.options.expiresIn when new session config is not set', async () => {
      const cookieName = 'strapi_admin_refresh';
      strapi = await createStrapiInstance({
        skipDefaultSessionConfig: true,
        async bootstrap({ strapi: s }) {
          s.config.set('admin.rateLimit.enabled', false);
          s.config.set('admin.auth.options', { expiresIn: '2m' });
        },
      });
      rq = await createAuthRequest({ strapi });

      const beforeLogin = Date.now();
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: { ...superAdmin.loginInfo, rememberMe: true },
      });
      const afterLogin = Date.now();

      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();

      const setCookies = (res.headers['set-cookie'] || []) as string[];
      const refreshCookie = setCookies.find((c) => c.startsWith(`${cookieName}=`));
      expect(refreshCookie).toBeDefined();

      const expiresMatch = refreshCookie!.match(/expires=([^;]+)/i);
      expect(expiresMatch).toBeDefined();
      const cookieExpiresAt = new Date(expiresMatch![1].trim()).getTime();
      const expectedLifespanMs = 2 * 60 * 1000;
      const toleranceMs = 10 * 1000;
      expect(cookieExpiresAt).toBeGreaterThanOrEqual(
        beforeLogin + expectedLifespanMs - toleranceMs
      );
      expect(cookieExpiresAt).toBeLessThanOrEqual(afterLogin + expectedLifespanMs + toleranceMs);
    });
  });

  describe('Mixed Configuration Scenarios', () => {
    beforeEach(async () => {
      strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.rateLimit.enabled', false);
          // Legacy configuration
          s.config.set('admin.auth.options', {
            algorithm: 'HS256',
            issuer: 'legacy-issuer',
          });
          // New configuration (should take priority)
          s.config.set('admin.auth.sessions.options', {
            algorithm: 'HS384',
            audience: 'new-audience',
            subject: 'new-subject',
          });
        },
      });
      rq = await createAuthRequest({ strapi });
      utils = createUtils(strapi);
    });

    test('Works with both legacy and new configuration (sessions.options priority)', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: superAdmin.loginInfo,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();

      // Decode the JWT to verify mixed configuration
      const token = res.body.data.token;
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded?.header.alg).toBe('HS384'); // From sessions.options
      expect(decoded?.payload.iss).toBe('legacy-issuer'); // From legacy auth.options
      expect(decoded?.payload.aud).toBe('new-audience'); // From sessions.options
      expect(decoded?.payload.sub).toBe('new-subject'); // From sessions.options
    });
  });
});
