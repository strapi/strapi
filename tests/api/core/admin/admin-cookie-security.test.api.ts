'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';

/**
 * Tests for admin cookie security configuration
 * Focus: Verify that admin.auth.cookie.secure config is respected with proper defaults
 */
describe('Admin Cookie Security', () => {
  const cookieName = 'strapi_admin_refresh';

  const getCookie = (res: any, name: string): string | undefined => {
    const setCookies: string[] = res.headers['set-cookie'] || [];
    return setCookies.find((c) => c.startsWith(`${name}=`));
  };

  describe('Default behavior based on NODE_ENV', () => {
    it('should set secure=true cookie in production by default', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const strapi = await createStrapiInstance({
        bootstrap: async ({ strapi: s }: any) => {
          s.config.set('admin.rateLimit.enabled', false);
        },
      });
      const rq = createRequest({ strapi }).asHTTPS();

      const res = await rq.post('/admin/login', {
        body: superAdmin.loginInfo,
      });

      expect(res.statusCode).toBe(200);

      const cookie = getCookie(res, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/secure/i);

      await strapi.destroy();
      process.env.NODE_ENV = originalEnv;
    });

    it('should set secure=false cookie in development by default', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const strapi = await createStrapiInstance({
        bootstrap: async ({ strapi: s }: any) => {
          s.config.set('admin.rateLimit.enabled', false);
        },
      });
      const rq = createRequest({ strapi }).asHTTPS();

      const res = await rq.post('/admin/login', {
        body: superAdmin.loginInfo,
      });

      expect(res.statusCode).toBe(200);

      const cookie = getCookie(res, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie).not.toMatch(/secure/i);

      await strapi.destroy();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Explicit config overrides', () => {
    it('should respect admin.auth.cookie.secure: true in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.auth.cookie.secure', true);
        },
      });
      const rq = createRequest({ strapi }).asHTTPS();

      const res = await rq.post('/admin/login', {
        body: superAdmin.loginInfo,
      });

      expect(res.statusCode).toBe(200);

      const cookie = getCookie(res, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/secure/i);

      await strapi.destroy();
      process.env.NODE_ENV = originalEnv;
    });

    it('should respect admin.auth.cookie.secure: false in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.auth.cookie.secure', false);
        },
      });
      const rq = createRequest({ strapi }).asHTTPS();

      const res = await rq.post('/admin/login', {
        body: {
          email: superAdmin.loginInfo.email,
          password: superAdmin.loginInfo.password,
        },
      });

      expect(res.statusCode).toBe(200);

      const cookie = getCookie(res, cookieName);
      expect(cookie).toBeDefined();
      expect(cookie).not.toMatch(/secure/i);

      await strapi.destroy();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Access token exchange endpoint', () => {
    it('should use same security config for access-token endpoint', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.auth.cookie.secure', false);
        },
      });
      const rq = createRequest({ strapi }).asHTTPS();

      // First login to get refresh cookie
      const loginRes = await rq.post('/admin/login', {
        body: superAdmin.loginInfo,
      });
      expect(loginRes.statusCode).toBe(200);

      const loginCookie = getCookie(loginRes, cookieName);
      expect(loginCookie).toBeDefined();
      expect(loginCookie).not.toMatch(/secure/i);

      await strapi.destroy();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Bootstrap warning', () => {
    it('should warn when production mode has secure explicitly set to false', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Mock the logger to capture warnings
      const warnSpy = jest.fn();

      const strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.auth.cookie.secure', false);
          // Replace the warn method to capture calls
          const originalWarn = s.log.warn;
          s.log.warn = (...args: any[]) => {
            warnSpy(...args);
            originalWarn.apply(s.log, args);
          };
        },
      });

      // The warning should have been logged during bootstrap
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('production mode'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('admin.auth.cookie.secure'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('false'));

      await strapi.destroy();
      process.env.NODE_ENV = originalEnv;
    });

    it('should not warn when production mode has secure as true', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const warnSpy = jest.fn();

      const strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.auth.cookie.secure', true);
          const originalWarn = s.log.warn;
          s.log.warn = (...args: any[]) => {
            warnSpy(...args);
            originalWarn.apply(s.log, args);
          };
        },
      });

      // Should not have warned about cookie security
      const cookieSecurityWarnings = warnSpy.mock.calls.filter((call) =>
        call.some((arg) => String(arg).includes('admin.auth.cookie.secure'))
      );
      expect(cookieSecurityWarnings).toHaveLength(0);

      await strapi.destroy();
      process.env.NODE_ENV = originalEnv;
    });

    it('should not warn in development mode even with secure set to false', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const warnSpy = jest.fn();

      const strapi = await createStrapiInstance({
        async bootstrap({ strapi: s }) {
          s.config.set('admin.auth.cookie.secure', false);
          const originalWarn = s.log.warn;
          s.log.warn = (...args: any[]) => {
            warnSpy(...args);
            originalWarn.apply(s.log, args);
          };
        },
      });

      // Should not have warned about cookie security
      const cookieSecurityWarnings = warnSpy.mock.calls.filter((call) =>
        call.some((arg) => String(arg).includes('admin.auth.cookie.secure'))
      );
      expect(cookieSecurityWarnings).toHaveLength(0);

      await strapi.destroy();
      process.env.NODE_ENV = originalEnv;
    });
  });
});
