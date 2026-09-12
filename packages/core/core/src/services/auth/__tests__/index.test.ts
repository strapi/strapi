import createAuthentication from '../index';

const okStrategy = (name = 'api-token') => ({
  name,
  authenticate: jest.fn(async () => ({ authenticated: true, credentials: { id: 1 } })),
  verify: jest.fn(),
});

const makeCtx = (route: Record<string, unknown>) =>
  ({
    state: { route },
    unauthorized: jest.fn(),
    forbidden: jest.fn(),
  }) as never;

const routeFor = (auth: unknown, type = 'content-api') => ({
  info: { type },
  config: { auth },
});

describe('handlers that run once a request’s identity is settled', () => {
  it('run for an authenticated request, before the route does', async () => {
    const auth = createAuthentication();
    const order: string[] = [];
    auth.register('content-api', okStrategy());
    auth.onAuthenticated(() => {
      order.push('handler');
    });

    await auth.authenticate(makeCtx(routeFor(undefined)), async () => {
      order.push('route');
    });

    expect(order).toEqual(['handler', 'route']);
  });

  it('see who the caller turned out to be', async () => {
    const auth = createAuthentication();
    const seen: unknown[] = [];
    auth.register('content-api', okStrategy());
    auth.onAuthenticated((ctx) => {
      seen.push(ctx.state.auth);
    });

    await auth.authenticate(makeCtx(routeFor(undefined)), async () => {});

    expect(seen[0]).toMatchObject({ credentials: { id: 1 } });
  });

  it('run for a route that needs no authentication, so anonymous callers are seen too', async () => {
    // Otherwise a public content API request would reach the database with
    // nothing decided about it.
    const auth = createAuthentication();
    const handler = jest.fn();
    auth.onAuthenticated(handler);

    await auth.authenticate(makeCtx(routeFor(false)), async () => {});

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('do not run for a request that failed to authenticate', async () => {
    const auth = createAuthentication();
    const handler = jest.fn();
    const next = jest.fn();
    auth.register('content-api', {
      name: 'api-token',
      authenticate: async () => ({ authenticated: false }),
    });
    auth.onAuthenticated(handler);

    const ctx = makeCtx(routeFor(undefined));
    await auth.authenticate(ctx, next);

    expect(handler).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(ctx.unauthorized).toHaveBeenCalled();
  });

  it('run in the order they were registered', async () => {
    const auth = createAuthentication();
    const order: string[] = [];
    auth.onAuthenticated(() => {
      order.push('first');
    });
    auth.onAuthenticated(() => {
      order.push('second');
    });

    await auth.authenticate(makeCtx(routeFor(false)), async () => {});

    expect(order).toEqual(['first', 'second']);
  });

  it('are awaited one after another, not raced', async () => {
    // One may depend on what an earlier one put on the context.
    const auth = createAuthentication();
    const order: string[] = [];
    auth.onAuthenticated(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });
      order.push('slow');
    });
    auth.onAuthenticated(() => {
      order.push('fast');
    });

    await auth.authenticate(makeCtx(routeFor(false)), async () => {});

    expect(order).toEqual(['slow', 'fast']);
  });

  it('stop the request when one refuses', async () => {
    // Rejecting is done the Koa way: throw.
    const auth = createAuthentication();
    const next = jest.fn();
    auth.onAuthenticated(() => {
      throw new Error('No space for you.');
    });

    await expect(auth.authenticate(makeCtx(routeFor(false)), next)).rejects.toThrow(
      'No space for you.'
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('can be unregistered', async () => {
    const auth = createAuthentication();
    const handler = jest.fn();
    const remove = auth.onAuthenticated(handler);

    remove();
    await auth.authenticate(makeCtx(routeFor(false)), async () => {});

    expect(handler).not.toHaveBeenCalled();
  });

  it('are left alone when the same handler is unregistered twice', () => {
    const auth = createAuthentication();
    const kept = jest.fn();
    const remove = auth.onAuthenticated(jest.fn());
    auth.onAuthenticated(kept);

    remove();

    expect(() => remove()).not.toThrow();
  });

  it('still run for the second one after the first is unregistered', async () => {
    const auth = createAuthentication();
    const kept = jest.fn();
    const remove = auth.onAuthenticated(jest.fn());
    auth.onAuthenticated(kept);

    remove();
    await auth.authenticate(makeCtx(routeFor(false)), async () => {});

    expect(kept).toHaveBeenCalledTimes(1);
  });

  describe('a route that authenticates itself', () => {
    it('can run them once it knows who the caller is', async () => {
      // The MCP endpoint does this: its protocol carries the credential, so
      // the strategy has nothing to go on until the body is read.
      const auth = createAuthentication();
      const seen: unknown[] = [];
      auth.onAuthenticated((ctx) => {
        seen.push(ctx.state.user);
      });

      const ctx = { state: { user: { id: 9 } } } as never;
      await auth.runAuthenticated(ctx);

      expect(seen).toEqual([{ id: 9 }]);
    });

    it('may run them a second time, with the identity it has since settled', async () => {
      const auth = createAuthentication();
      const handler = jest.fn();
      auth.onAuthenticated(handler);

      const ctx = makeCtx(routeFor(false));
      await auth.authenticate(ctx, async () => {});
      await auth.runAuthenticated(ctx);

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  it('are nothing to worry about when none are registered', async () => {
    const auth = createAuthentication();
    const next = jest.fn();

    await auth.authenticate(makeCtx(routeFor(false)), next);

    expect(next).toHaveBeenCalled();
  });
});
