'use strict';

/* eslint-env jest */

const utils = require('@strapi/utils');

const { RateLimitError } = utils.errors;

const {
  buildPrefixKey,
  ROUTES_WITHOUT_IDENTIFIER,
  normalizeRequestPathForRateLimit,
  buildRateLimitLoadConfig,
} = require('../rateLimit');

const makeCtx = ({ path: requestPath, ip = '203.0.113.1', body = {} } = {}) => ({
  request: {
    path: requestPath,
    ip,
    body,
  },
});

describe('users-permissions rateLimit middleware', () => {
  describe('buildPrefixKey', () => {
    describe('routes that use email as a legitimate identifier', () => {
      it('includes lower-cased email from body for /auth/local/register', () => {
        const ctx = makeCtx({
          path: '/api/auth/local/register',
          body: { email: 'User@Example.com' },
        });

        expect(buildPrefixKey(ctx)).toBe('user@example.com:/api/auth/local/register:203.0.113.1');
      });

      it('includes email from body for /auth/forgot-password', () => {
        const ctx = makeCtx({
          path: '/api/auth/forgot-password',
          body: { email: 'victim@example.com' },
        });

        expect(buildPrefixKey(ctx)).toBe(
          'victim@example.com:/api/auth/forgot-password:203.0.113.1'
        );
      });

      it('falls back to unknownIdentifier when email is missing', () => {
        const ctx = makeCtx({
          path: '/api/auth/forgot-password',
          body: {},
        });

        expect(buildPrefixKey(ctx)).toBe('unknownIdentifier:/api/auth/forgot-password:203.0.113.1');
      });

      it('falls back to unknownIdentifier when email is not a string', () => {
        const ctx = makeCtx({
          path: '/api/auth/forgot-password',
          body: { email: { nested: true } },
        });

        expect(buildPrefixKey(ctx)).toBe('unknownIdentifier:/api/auth/forgot-password:203.0.113.1');
      });

      it('falls back to unknownIdentifier when email is a number', () => {
        const ctx = makeCtx({
          path: '/api/auth/forgot-password',
          body: { email: 99 },
        });

        expect(buildPrefixKey(ctx)).toBe('unknownIdentifier:/api/auth/forgot-password:203.0.113.1');
      });
    });

    describe('routes that must not include the email identifier (GHSA-7mqx-wwh4-f9fw)', () => {
      it.each(ROUTES_WITHOUT_IDENTIFIER)(
        'uses noIdentifier prefix for %s regardless of body.email',
        (route) => {
          const baseCtx = makeCtx({ path: route });
          const baseKey = buildPrefixKey(baseCtx);

          // An attacker varying body.email must not change the key.
          for (const email of ['a@a.com', 'b@b.com', '<random>', '']) {
            const ctx = makeCtx({ path: route, body: { email } });
            expect(buildPrefixKey(ctx)).toBe(baseKey);
          }

          expect(baseKey).toBe(`noIdentifier:${route}:203.0.113.1`);
        }
      );

      it('matches paths regardless of router mount prefix', () => {
        const bare = makeCtx({ path: '/auth/local' });
        const prefixed = makeCtx({ path: '/api/auth/local' });

        expect(buildPrefixKey(bare)).toBe('noIdentifier:/auth/local:203.0.113.1');
        expect(buildPrefixKey(prefixed)).toBe('noIdentifier:/api/auth/local:203.0.113.1');
      });

      it('treats paths with a trailing slash like their canonical form (no email bypass)', () => {
        const withSlash = makeCtx({
          path: '/api/auth/local/',
          body: { email: 'a@a.com' },
        });
        const noSlash = makeCtx({
          path: '/api/auth/local',
          body: { email: 'b@b.com' },
        });

        expect(buildPrefixKey(withSlash)).toBe(buildPrefixKey(noSlash));
        expect(buildPrefixKey(withSlash)).toBe('noIdentifier:/api/auth/local:203.0.113.1');
      });

      it('treats OAuth callback paths (/connect/*) as identifier-less', () => {
        const ctx = makeCtx({
          path: '/api/connect/google/callback',
          body: { email: 'attacker@example.com' },
        });

        expect(buildPrefixKey(ctx)).toBe('noIdentifier:/api/connect/google/callback:203.0.113.1');
      });

      it('strips trailing slashes on connect paths for stable keys', () => {
        const a = makeCtx({
          path: '/api/connect/google/callback/',
          body: { email: 'x@x.com' },
        });
        const b = makeCtx({
          path: '/api/connect/google/callback',
          body: { email: 'y@y.com' },
        });

        expect(buildPrefixKey(a)).toBe(buildPrefixKey(b));
      });
    });

    describe('path normalization (.. segments and duplicate slashes)', () => {
      it('classifies /auth/reset-password/../local as the login route (no identifier)', () => {
        const ctx = makeCtx({
          path: '/api/auth/reset-password/../local',
          body: { email: 'roll@dice.com' },
        });

        expect(buildPrefixKey(ctx)).toBe('noIdentifier:/api/auth/local:203.0.113.1');
      });

      it('collapses duplicate slashes before matching routes', () => {
        const ctx = makeCtx({
          path: '//api//auth//local',
          body: { email: 'trick@example.com' },
        });

        expect(buildPrefixKey(ctx)).toBe('noIdentifier:/api/auth/local:203.0.113.1');
      });
    });

    describe('input handling', () => {
      it('falls back to invalidPath and the email-identifier branch when ctx.request.path is not a string', () => {
        // Conservative default: if we cannot determine the path we cannot
        // verify it is on the no-identifier list, so treat it as a route
        // where the email key applies. The throttle still engages.
        const ctx = makeCtx({ path: undefined });

        expect(buildPrefixKey(ctx)).toBe('unknownIdentifier:invalidPath:203.0.113.1');
      });

      it('lowercases the request path', () => {
        const ctx = makeCtx({ path: '/API/Auth/Forgot-Password', body: { email: 'a@b.com' } });

        expect(buildPrefixKey(ctx)).toBe('a@b.com:/api/auth/forgot-password:203.0.113.1');
      });

      it('keys vary by IP for the same email', () => {
        const a = makeCtx({
          path: '/api/auth/forgot-password',
          body: { email: 'victim@example.com' },
          ip: '198.51.100.1',
        });
        const b = makeCtx({
          path: '/api/auth/forgot-password',
          body: { email: 'victim@example.com' },
          ip: '198.51.100.2',
        });

        expect(buildPrefixKey(a)).not.toBe(buildPrefixKey(b));
      });
    });
  });

  describe('normalizeRequestPathForRateLimit', () => {
    it('removes trailing slashes except preserves root', () => {
      expect(normalizeRequestPathForRateLimit('/api/auth/local/')).toBe('/api/auth/local');
      expect(normalizeRequestPathForRateLimit('/')).toBe('/');
    });
  });

  describe('buildRateLimitLoadConfig', () => {
    it('always sets prefixKey from buildPrefixKey so plugin config cannot override it', () => {
      const ctx = makeCtx({
        path: '/api/auth/local',
        body: { email: 'inject@example.com' },
      });

      const loadConfig = buildRateLimitLoadConfig(
        ctx,
        {
          prefixKey: 'hijacked-from-strapi-config',
          max: 42,
          interval: { min: 1 },
        },
        {
          prefixKey: 'hijacked-from-route-config',
        }
      );

      expect(loadConfig.prefixKey).toBe(buildPrefixKey(ctx));
      expect(loadConfig.prefixKey).toBe('noIdentifier:/api/auth/local:203.0.113.1');
      expect(loadConfig.max).toBe(42);
      expect(loadConfig.interval).toEqual({ min: 1 });
    });

    it('always sets handler last so user config cannot replace the RateLimitError handler', () => {
      const ctx = makeCtx({ path: '/api/auth/forgot-password', body: { email: 'a@b.com' } });
      const evilHandler = jest.fn();

      const loadConfig = buildRateLimitLoadConfig(ctx, { handler: evilHandler }, {});

      expect(loadConfig.handler).not.toBe(evilHandler);
      expect(() => loadConfig.handler()).toThrow(RateLimitError);
    });
  });
});
