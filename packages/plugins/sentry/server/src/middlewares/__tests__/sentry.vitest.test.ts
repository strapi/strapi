import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/strapi';

import sentryMiddleware from '../sentry';

const STRAPI_VERSION = '5.0.0';

type Middleware = (ctx: unknown, next: () => Promise<void>) => Promise<void>;

const setup = () => {
  const scope = { addEventProcessor: vi.fn(), setTag: vi.fn() };
  const sentryService = {
    init: vi.fn(),
    getInstance: vi.fn(() => ({ Handlers: { parseRequest: vi.fn() } })),
    sendError: vi.fn((_error: Error, configureScope: (s: typeof scope) => void) => {
      configureScope(scope);
    }),
  };
  let middleware: Middleware | undefined;
  const info = { strapi: STRAPI_VERSION };
  const strapi = {
    // Mirrors the config provider: the startup copy as own keys, plus `get` over the live tree
    config: {
      info,
      get: vi.fn((key: string) => (key === 'info.strapi' ? info.strapi : undefined)),
    },
    plugin: vi.fn(() => ({ service: vi.fn(() => sentryService) })),
    server: {
      use: vi.fn((fn: Middleware) => {
        middleware = fn;
      }),
    },
  };

  sentryMiddleware({ strapi: strapi as unknown as Core.Strapi });

  return { scope, sentryService, getMiddleware: () => middleware! };
};

describe('Sentry middleware', () => {
  it('tags errors sent to Sentry with the Strapi version', async () => {
    const { scope, sentryService, getMiddleware } = setup();
    const error = new Error('boom');
    const ctx = { method: 'GET', _matchedRoute: '/api/articles', request: {} };

    await expect(
      getMiddleware()(ctx, async () => {
        throw error;
      })
    ).rejects.toBe(error);

    expect(sentryService.sendError).toHaveBeenCalledWith(error, expect.any(Function));
    expect(scope.setTag).toHaveBeenCalledWith('strapi_version', STRAPI_VERSION);
    expect(scope.setTag).toHaveBeenCalledWith('transaction', 'GET /api/articles');
  });
});
