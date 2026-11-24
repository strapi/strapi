import { beforeEach, describe, expect, it, vi } from 'vitest';

import sentryMiddleware from '../sentry';

const sendError = vi.fn();

const setup = () => {
  let middleware: (ctx: unknown, next: () => Promise<unknown>) => Promise<unknown>;

  const strapi = {
    plugin: () => ({
      service: () => ({
        init: vi.fn(),
        getInstance: () => ({ Handlers: { parseRequest: vi.fn() } }),
        sendError,
      }),
    }),
    server: {
      use(fn: typeof middleware) {
        middleware = fn;
      },
    },
    config: { info: { strapi: '5.0.0' } },
  } as any;

  sentryMiddleware({ strapi });

  const ctx = { method: 'GET', _matchedRoute: '/x', request: {} };

  return (error: unknown) =>
    middleware(ctx, async () => {
      throw error;
    });
};

describe('Sentry middleware', () => {
  beforeEach(() => {
    sendError.mockClear();
  });

  it('sends the errors of a request to Sentry and rethrows them', async () => {
    const error = new Error('boom');

    await expect(setup()(error)).rejects.toBe(error);
    expect(sendError).toHaveBeenCalledTimes(1);
  });

  it('does not send a QueryAbortedError (the client left), and still rethrows it', async () => {
    const error = new Error('The request was aborted before the query completed');
    error.name = 'QueryAbortedError';

    await expect(setup()(error)).rejects.toBe(error);
    expect(sendError).not.toHaveBeenCalled();
  });
});
