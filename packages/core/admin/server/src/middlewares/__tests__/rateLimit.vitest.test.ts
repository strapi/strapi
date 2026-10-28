import { describe, expect, test } from 'vitest';
import type { Context } from 'koa';

import { rateLimitKey } from '../rateLimit';

const ctx = ({
  user,
  route,
  path = '/admin/login',
  body = {},
  ip = '10.0.0.1',
  method = 'POST',
}: {
  user?: { id: number | string };
  route?: { method?: string; path?: string };
  path?: string;
  body?: Record<string, unknown>;
  ip?: string;
  method?: string;
} = {}) =>
  ({
    method,
    state: { ...(user ? { user } : {}), ...(route ? { route } : {}) },
    request: { path, body, ip },
  }) as unknown as Context;

describe('rateLimitKey', () => {
  describe('without a session', () => {
    test('keys on the email, the path and the address, as it always has', () => {
      expect(rateLimitKey(ctx({ body: { email: 'Ana@Acme.com' } }))).toBe(
        'ana@acme.com:/admin/login:10.0.0.1'
      );
    });

    test('a body without an email degrades to one bucket per path and address', () => {
      expect(rateLimitKey(ctx({ path: '/admin/login/mfa' }))).toBe(
        'unknownEmail:/admin/login/mfa:10.0.0.1'
      );
    });
  });

  describe('with a session', () => {
    const route = { method: 'POST', path: '/mfa/disable' };

    test('keys on the account and the route, not on the address', () => {
      expect(rateLimitKey(ctx({ user: { id: 7 }, route, path: '/admin/mfa/disable' }))).toBe(
        'user:7:post:/mfa/disable'
      );
    });

    /** Two colleagues behind one office NAT must not spend each other's allowance. */
    test('two accounts behind one address get two buckets', () => {
      const a = rateLimitKey(ctx({ user: { id: 7 }, route, ip: '203.0.113.9' }));
      const b = rateLimitKey(ctx({ user: { id: 8 }, route, ip: '203.0.113.9' }));

      expect(a).not.toBe(b);
    });

    /** Spreading guesses over addresses must not multiply them. */
    test('one account from many addresses gets one bucket', () => {
      const a = rateLimitKey(ctx({ user: { id: 7 }, route, ip: '198.51.100.1' }));
      const b = rateLimitKey(ctx({ user: { id: 7 }, route, ip: '198.51.100.2' }));

      expect(a).toBe(b);
    });

    /**
     * The defect this exists for: a credential-checking route with an id in its path gave a fresh
     * bucket per id, and since the password is verified before ownership, that was no bound at all.
     */
    test('a parameter in the path does not buy a fresh bucket', () => {
      const pattern = { method: 'POST', path: '/mfa/passkeys/:id/remove' };

      expect(
        rateLimitKey(ctx({ user: { id: 7 }, route: pattern, path: '/admin/mfa/passkeys/1/remove' }))
      ).toBe(
        rateLimitKey(ctx({ user: { id: 7 }, route: pattern, path: '/admin/mfa/passkeys/2/remove' }))
      );
    });

    test('an email in an authenticated body cannot steer the key either', () => {
      expect(
        rateLimitKey(ctx({ user: { id: 7 }, route, body: { email: 'someone-else@acme.com' } }))
      ).toBe('user:7:post:/mfa/disable');
    });

    test('different routes for one account are counted separately', () => {
      expect(rateLimitKey(ctx({ user: { id: 7 }, route }))).not.toBe(
        rateLimitKey(ctx({ user: { id: 7 }, route: { method: 'POST', path: '/mfa/enrol' } }))
      );
    });
  });
});
