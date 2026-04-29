'use strict';

/* eslint-env jest */

const { buildPrefixKey, ROUTES_WITHOUT_IDENTIFIER } = require('../rateLimit');

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

        expect(buildPrefixKey(ctx)).toBe(
          'user@example.com:/api/auth/local/register:203.0.113.1'
        );
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

        expect(buildPrefixKey(ctx)).toBe(
          'unknownIdentifier:/api/auth/forgot-password:203.0.113.1'
        );
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
        expect(buildPrefixKey(prefixed)).toBe(
          'noIdentifier:/api/auth/local:203.0.113.1'
        );
      });

      it('treats OAuth callback paths (/connect/*) as identifier-less', () => {
        const ctx = makeCtx({
          path: '/api/connect/google/callback',
          body: { email: 'attacker@example.com' },
        });

        expect(buildPrefixKey(ctx)).toBe(
          'noIdentifier:/api/connect/google/callback:203.0.113.1'
        );
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

        expect(buildPrefixKey(ctx)).toBe(
          'a@b.com:/api/auth/forgot-password:203.0.113.1'
        );
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
});
