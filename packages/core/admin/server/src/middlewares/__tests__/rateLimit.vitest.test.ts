import { describe, test, expect, vi } from 'vitest';
import type { Context, Next } from 'koa';
import type { Core } from '@strapi/types';
import createRateLimitMiddleware from '../rateLimit';

const makeStrapi = (rateLimitConfig?: Record<string, unknown>): Core.Strapi =>
  ({
    config: {
      get: vi.fn((key: string) => (key === 'admin.rateLimit' ? rateLimitConfig : undefined)),
    },
  }) as unknown as Core.Strapi;

const makeCtx = (): Context =>
  ({
    request: { ip: '10.0.0.1', path: '/test', body: {} },
    set: vi.fn(),
    state: {},
  }) as unknown as Context;

// koa2-ratelimit shares one memory store across middleware instances, so every test
// needs its own prefixKey to count from zero.
describe('admin::rateLimit middleware', () => {
  test('limits requests using the global admin.rateLimit settings by default', async () => {
    const middleware = createRateLimitMiddleware(
      { prefixKey: 'test:default', max: 1 },
      { strapi: makeStrapi({ enabled: true }) }
    );
    const next: Next = vi.fn(async () => {});

    await middleware(makeCtx(), next);
    await expect(middleware(makeCtx(), next)).rejects.toMatchObject({ name: 'RateLimitError' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('a route-level enabled: false skips the limiter even when the global limit is on', async () => {
    const middleware = createRateLimitMiddleware(
      { enabled: false, prefixKey: 'test:route-off', max: 1 },
      { strapi: makeStrapi({ enabled: true }) }
    );
    const next: Next = vi.fn(async () => {});
    const ctx = makeCtx();

    await middleware(ctx, next);
    await middleware(ctx, next);

    expect(next).toHaveBeenCalledTimes(2);
    // No X-RateLimit-* headers: the limiter never ran.
    expect(ctx.set).not.toHaveBeenCalled();
  });

  test('a route-level enabled: true keeps the limiter on when admin.rateLimit is disabled', async () => {
    const middleware = createRateLimitMiddleware(
      { enabled: true, prefixKey: 'test:route-on', max: 1 },
      { strapi: makeStrapi({ enabled: false }) }
    );
    const next: Next = vi.fn(async () => {});

    await middleware(makeCtx(), next);
    await expect(middleware(makeCtx(), next)).rejects.toMatchObject({ name: 'RateLimitError' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('without a route-level enabled, admin.rateLimit.enabled: false turns the limiter off', async () => {
    const middleware = createRateLimitMiddleware(
      { prefixKey: 'test:global-off', max: 1 },
      { strapi: makeStrapi({ enabled: false }) }
    );
    const next: Next = vi.fn(async () => {});
    const ctx = makeCtx();

    await middleware(ctx, next);
    await middleware(ctx, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(ctx.set).not.toHaveBeenCalled();
  });
});
