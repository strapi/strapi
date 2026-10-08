import { describe, it, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';

import composeEndpoint from '../compose-endpoint';

const createForeignError = (name: string) => Object.assign(new Error(name), { name, details: {} });

const createRouteHandler = (verifyError: Error) => {
  const auth = {
    authenticate: (_ctx: unknown, next: () => Promise<unknown>) => next(),
    verify: vi.fn().mockRejectedValue(verifyError),
  };

  const strapi = {
    get: vi.fn((service: string) => {
      if (service === 'auth') return auth;
      if (service === 'policies') return { resolve: () => [] };
      throw new Error(`Unexpected service ${service}`);
    }),
  } as unknown as Core.Strapi;

  const router = { get: vi.fn() };

  composeEndpoint(strapi)(
    {
      method: 'GET',
      path: '/protected',
      handler: vi.fn(),
      config: { auth: {} },
      info: { type: 'content-api' },
    } as unknown as Core.Route,
    { router: router as never }
  );

  return router.get.mock.calls[0][1] as Core.MiddlewareHandler;
};

const createContext = () => ({ state: {}, unauthorized: vi.fn(), forbidden: vi.fn() });

describe('compose endpoint authorization with another copy of @strapi/utils', () => {
  it('responds 401 to an UnauthorizedError', async () => {
    const ctx = createContext();

    await createRouteHandler(createForeignError('UnauthorizedError'))(ctx as never, vi.fn());

    expect(ctx.unauthorized).toHaveBeenCalledTimes(1);
    expect(ctx.forbidden).not.toHaveBeenCalled();
  });

  it('responds 403 to a ForbiddenError', async () => {
    const ctx = createContext();

    await createRouteHandler(createForeignError('ForbiddenError'))(ctx as never, vi.fn());

    expect(ctx.forbidden).toHaveBeenCalledTimes(1);
    expect(ctx.unauthorized).not.toHaveBeenCalled();
  });

  it('rethrows a PolicyError so its message reaches the response', async () => {
    const ctx = createContext();
    const error = createForeignError('PolicyError');

    await expect(createRouteHandler(error)(ctx as never, vi.fn())).rejects.toBe(error);
    expect(ctx.forbidden).not.toHaveBeenCalled();
  });

  it('rethrows unrelated errors', async () => {
    const ctx = createContext();
    const error = new Error('boom');

    await expect(createRouteHandler(error)(ctx as never, vi.fn())).rejects.toBe(error);
    expect(ctx.unauthorized).not.toHaveBeenCalled();
    expect(ctx.forbidden).not.toHaveBeenCalled();
  });
});
