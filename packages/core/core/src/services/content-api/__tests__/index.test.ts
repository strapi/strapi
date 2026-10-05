import createContentAPI from '..';

const strapiMock = {
  config: {
    get: () => '',
  },
  apis: {},
  plugins: {},
};

describe('Content API - getRoutesMap', () => {
  const contentApiRoute = (overrides: Record<string, unknown> = {}) => ({
    method: 'GET',
    handler: '',
    request: {},
    info: { type: 'content-api' as const },
    ...overrides,
  });

  test('includes routes from a plugin whose routes are a flat array', async () => {
    global.strapi = {
      ...strapiMock,
      plugins: {
        foo: {
          routes: [
            contentApiRoute({ path: '/foo' }),
            contentApiRoute({ path: '/admin-only', info: { type: 'admin' } }),
          ],
        },
      },
    } as any;

    const contentAPI = createContentAPI(global.strapi);
    const routesMap = await contentAPI.getRoutesMap();

    expect(routesMap['plugin::foo']).toEqual([
      expect.objectContaining({ path: '/foo/foo', info: { type: 'content-api' } }),
    ]);
  });

  test('includes routes from a plugin whose routes are keyed by router name', async () => {
    global.strapi = {
      ...strapiMock,
      plugins: {
        bar: {
          routes: {
            'content-api': {
              type: 'content-api',
              routes: [contentApiRoute({ path: '/baz' })],
            },
          },
        },
      },
    } as any;

    const contentAPI = createContentAPI(global.strapi);
    const routesMap = await contentAPI.getRoutesMap();

    expect(routesMap['plugin::bar']).toEqual([
      expect.objectContaining({ path: '/bar/baz', info: { type: 'content-api' } }),
    ]);
  });
});
