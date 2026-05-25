import { createMultitenancyMiddleware } from '../multitenancy';

const spaceScopedCT = { pluginOptions: { spaces: { scope: 'space' } } };
const platformCT = { pluginOptions: { spaces: { scope: 'platform' } } };

const makeStrapi = (spaceId: number | undefined) =>
  ({
    requestContext: {
      get: () => (spaceId === undefined ? undefined : { state: { spaceId } }),
    },
    plugins: {
      spaces: {
        services: {
          'content-types': {
            isSpaceScopedContentType: (m: any) =>
              m?.pluginOptions?.spaces?.scope === 'space',
          },
        },
      },
    },
  }) as any;

describe('multitenancy document-service middleware', () => {
  beforeEach(() => {
    // The middleware reads from global.strapi via the getService helper.
    (global as any).strapi = makeStrapi(42);
  });

  it('injects params.lookup.space on findMany for space-scoped CTs', async () => {
    const middleware = createMultitenancyMiddleware(makeStrapi(42));
    const ctx: any = { contentType: spaceScopedCT, action: 'findMany', params: {} };
    const next = jest.fn();

    await middleware(ctx, next);

    expect(ctx.params.filters).toEqual({ space: { id: 42 } });
    expect(next).toHaveBeenCalled();
  });

  it('hooks count too (Guarantee 1)', async () => {
    const middleware = createMultitenancyMiddleware(makeStrapi(7));
    const ctx: any = { contentType: spaceScopedCT, action: 'count', params: {} };

    await middleware(ctx, jest.fn());

    expect(ctx.params.filters).toEqual({ space: { id: 7 } });
  });

  it('stamps params.data.space on create when not set', async () => {
    const middleware = createMultitenancyMiddleware(makeStrapi(99));
    const ctx: any = {
      contentType: spaceScopedCT,
      action: 'create',
      params: { data: { title: 'Hello' } },
    };

    await middleware(ctx, jest.fn());

    expect(ctx.params.data.space).toBe(99);
    expect(ctx.params.filters).toEqual({ space: { id: 99 } });
  });

  it("doesn't overwrite an explicitly-provided params.data.space", async () => {
    const middleware = createMultitenancyMiddleware(makeStrapi(99));
    const ctx: any = {
      contentType: spaceScopedCT,
      action: 'create',
      params: { data: { title: 'Hello', space: 7 } },
    };

    await middleware(ctx, jest.fn());

    expect(ctx.params.data.space).toBe(7);
  });

  it('is a no-op for platform-scoped CTs', async () => {
    const middleware = createMultitenancyMiddleware(makeStrapi(42));
    const ctx: any = { contentType: platformCT, action: 'findMany', params: {} };

    await middleware(ctx, jest.fn());

    expect(ctx.params.filters).toBeUndefined();
  });

  it('is a no-op when no spaceId is on the request context', async () => {
    const strapi = makeStrapi(undefined);
    (global as any).strapi = strapi;
    const middleware = createMultitenancyMiddleware(strapi);
    const ctx: any = { contentType: spaceScopedCT, action: 'findMany', params: {} };

    await middleware(ctx, jest.fn());

    expect(ctx.params.filters).toBeUndefined();
  });

  it('preserves existing filters (composes with user filters)', async () => {
    const middleware = createMultitenancyMiddleware(makeStrapi(42));
    const ctx: any = {
      contentType: spaceScopedCT,
      action: 'findMany',
      params: { filters: { title: { $contains: 'hello' } } },
    };

    await middleware(ctx, jest.fn());

    expect(ctx.params.filters).toEqual({
      title: { $contains: 'hello' },
      space: { id: 42 },
    });
  });

  it("clobbers a user-supplied `space` filter (cross-tenant safety)", async () => {
    const middleware = createMultitenancyMiddleware(makeStrapi(42));
    const ctx: any = {
      contentType: spaceScopedCT,
      action: 'findMany',
      params: { filters: { space: { id: 99 } } },
    };

    await middleware(ctx, jest.fn());

    // The user tried to query space 99, we force-overrode to current space 42.
    expect(ctx.params.filters).toEqual({ space: { id: 42 } });
  });
});
