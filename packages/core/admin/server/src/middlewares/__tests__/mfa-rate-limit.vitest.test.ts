import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { Context, Next } from 'koa';

import mfaRateLimit from '../mfa-rate-limit';

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
