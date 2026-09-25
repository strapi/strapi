import type { Core } from '@strapi/types';

import composeEndpoint from '../compose-endpoint';

class ForeignUnauthorizedError extends Error {
  name = 'UnauthorizedError';

  details = {};
}

class ForeignForbiddenError extends Error {
  name = 'ForbiddenError';

  details = {};
}

const createRouteHandler = (verifyError: Error) => {
  const auth = {
    authenticate: (_ctx: unknown, next: () => Promise<unknown>) => next(),
    verify: jest.fn().mockRejectedValue(verifyError),
  };

  const strapi = {
    get: jest.fn((service: string) => {
      if (service === 'auth') {
        return auth;
      }

      if (service === 'policies') {
        return { resolve: () => [] };
      }

      throw new Error(`Unexpected service ${service}`);
    }),
  } as unknown as Core.Strapi;

  const router = {
    get: jest.fn(),
  };

  composeEndpoint(strapi)(
    {
      method: 'GET',
      path: '/protected',
      handler: jest.fn(),
      config: { auth: {} },
      info: { type: 'content-api' },
    } as unknown as Core.Route,
    { router: router as never }
  );

  return router.get.mock.calls[0][1] as Core.MiddlewareHandler;
};

const createContext = () => ({
  state: {},
  unauthorized: jest.fn(),
  forbidden: jest.fn(),
});

describe('compose endpoint authorization', () => {
  it('handles UnauthorizedError values created by another @strapi/utils copy', async () => {
    const handler = createRouteHandler(new ForeignUnauthorizedError('Unauthorized'));
    const ctx = createContext();

    await handler(ctx as never, jest.fn());

    expect(ctx.unauthorized).toHaveBeenCalledTimes(1);
    expect(ctx.forbidden).not.toHaveBeenCalled();
  });

  it('handles ForbiddenError values created by another @strapi/utils copy', async () => {
    const handler = createRouteHandler(new ForeignForbiddenError('Forbidden access'));
    const ctx = createContext();

    await handler(ctx as never, jest.fn());

    expect(ctx.forbidden).toHaveBeenCalledTimes(1);
    expect(ctx.unauthorized).not.toHaveBeenCalled();
  });

  it('still rethrows unrelated errors', async () => {
    const error = new Error('boom');
    const handler = createRouteHandler(error);
    const ctx = createContext();

    await expect(handler(ctx as never, jest.fn())).rejects.toBe(error);
    expect(ctx.unauthorized).not.toHaveBeenCalled();
    expect(ctx.forbidden).not.toHaveBeenCalled();
  });
});
