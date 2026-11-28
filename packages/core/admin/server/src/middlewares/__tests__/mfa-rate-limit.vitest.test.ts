import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { Context, Next } from 'koa';

import mfaRateLimit, { accountRateLimitKey } from '../mfa-rate-limit';

const limit = vi.fn(async (_ctx: Context, next: Next) => next());

vi.mock('../rateLimit', () => ({ default: vi.fn(() => limit) }));

const strapiWith = (isEnabled: () => boolean) =>
  ({ service: vi.fn(() => ({ isEnabled })) }) as never;

describe('admin::mfa-rate-limit', () => {
  beforeEach(() => {
    limit.mockClear();
  });

  // A flagged feature must leave `/reset-password` exactly as it was while the feature is off.
  test('passes straight through, unthrottled, while the feature is off', async () => {
    const next = vi.fn(async () => {});
    const middleware = mfaRateLimit({}, { strapi: strapiWith(() => false) });

    await middleware({} as Context, next);

    expect(limit).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('applies admin::rateLimit while the feature is on', async () => {
    const next = vi.fn(async () => {});
    const middleware = mfaRateLimit({}, { strapi: strapiWith(() => true) });

    await middleware({} as Context, next);

    expect(limit).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('asks on every request, so the kill switch applies without a restart', async () => {
    let enabled = true;
    const middleware = mfaRateLimit({}, { strapi: strapiWith(() => enabled) });

    await middleware(
      {} as Context,
      vi.fn(async () => {})
    );
    enabled = false;
    await middleware(
      {} as Context,
      vi.fn(async () => {})
    );

    expect(limit).toHaveBeenCalledTimes(1);
  });
});

describe('accountRateLimitKey', () => {
  const ctx = (userId: number, route: { method: string; path: string }, ip = '10.0.0.1') =>
    ({
      method: 'POST',
      state: { user: { id: userId }, route },
      request: { ip },
    }) as unknown as Context;
  const route = { method: 'POST', path: '/mfa/disable' };

  test('keys on the account and the route pattern', () => {
    expect(accountRateLimitKey(ctx(7, route))).toBe('user:7:post:/mfa/disable');
  });

  test('two accounts behind one address get two buckets', () => {
    expect(accountRateLimitKey(ctx(7, route, '203.0.113.9'))).not.toBe(
      accountRateLimitKey(ctx(8, route, '203.0.113.9'))
    );
  });

  test('one account from many addresses gets one bucket', () => {
    expect(accountRateLimitKey(ctx(7, route, '198.51.100.1'))).toBe(
      accountRateLimitKey(ctx(7, route, '198.51.100.2'))
    );
  });

  test('different routes for one account are counted separately', () => {
    expect(accountRateLimitKey(ctx(7, route))).not.toBe(
      accountRateLimitKey(ctx(7, { method: 'POST', path: '/mfa/enrol' }))
    );
  });
});
