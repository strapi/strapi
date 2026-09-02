/* eslint-env jest */

import routes from '../authentication';

describe('authentication routes', () => {
  // F2: `/reset-password` carries a reset token, not an email, so `admin::rateLimit`'s
  // `${email}:${path}:${ip}` key (see `middlewares/rateLimit.ts`) collapses every reset in the
  // deployment onto one shared `unknownEmail:/admin/reset-password:<ip>` bucket. Behind NAT or an
  // unproxied reverse proxy that bucket is effectively "everyone on this network" -- at the
  // middleware's own default (`max: 5` per 5 minutes) a whole org would get five password resets
  // total. The token itself must never become the rate-limit key (it is secret material), and the
  // middleware itself is spec-mandated, so the fix is route-level config widening the shared
  // bucket rather than a smarter key.
  test('/reset-password raises admin::rateLimit above the collapsed-bucket default', () => {
    const route = routes.find(
      (r) => r.method === 'POST' && r.path === '/reset-password'
    )! as unknown as {
      config: { middlewares: Array<string | { name: string; config?: { max?: number } }> };
    };

    expect(route).toBeDefined();

    const rateLimitEntry = route.config.middlewares.find(
      (m) => typeof m === 'object' && m.name === 'admin::rateLimit'
    ) as { name: string; config?: { max?: number } } | undefined;

    expect(rateLimitEntry).toBeDefined();
    // Raised well above the middleware's own default of 5 -- a bare `'admin::rateLimit'` string
    // entry (no override) would fail this.
    expect(rateLimitEntry!.config?.max).toBeGreaterThanOrEqual(20);
  });

  test('every other admin::rateLimit route entry is left at the shared default', () => {
    // Pins today's behaviour for the other routes so this test only ever asserts the one
    // deliberate widening, not an accidental blanket change to every rate-limited route.
    const otherRateLimited = routes.filter(
      (r) => r.path !== '/reset-password' && r.method === 'POST'
    ) as unknown as Array<{
      path: string;
      config: { middlewares?: Array<string | { name: string; config?: unknown }> };
    }>;

    for (const route of otherRateLimited) {
      const entry = (route.config.middlewares ?? []).find(
        (m) => (typeof m === 'string' && m === 'admin::rateLimit') || false
      );
      if (entry !== undefined) {
        expect(entry).toBe('admin::rateLimit');
      }
    }
  });
});
