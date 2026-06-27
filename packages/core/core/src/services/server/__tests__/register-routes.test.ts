import registerRoutes from '../register-routes';
import createContentAPI from '../../content-api';

declare const jest: any;

// The OpenAPI route registration is opt-in and pulls heavy deps; stub it out —
// this suite covers the default (flag-off) route-metadata path.
jest.mock('../openapi', () => ({
  registerOpenAPIRoute: jest.fn(),
}));

/**
 * Replicates the relevant side effect of the real route manager
 * (`services/server/routing.ts` → `createRoute`): it tags every registered
 * route IN PLACE with `info.type` (used downstream for content-api detection
 * and auth scoping). Registration hands the SOURCE route arrays to
 * `strapi.server.routes`, so this mutation must land on the source objects.
 */
const createServerRoutesMock = () =>
  jest.fn((router: any) => {
    const type = router.type ?? 'api';
    const tag = (route: any) => {
      route.info = { ...(route.info ?? {}), type };
    };
    (router.routes ?? []).forEach((route: any) => {
      if (route && Array.isArray(route.routes)) {
        route.routes.forEach(tag);
      } else if (route) {
        tag(route);
      }
    });
  });

const buildStrapiMock = () => {
  const contentAPIDeps = {
    sanitizers: { get: () => [] },
    validators: { get: () => [] },
  };

  const apiRoute = {
    method: 'GET',
    path: '/foos',
    handler: 'foo.find',
    config: {},
    request: {},
  } as any;

  const adminRoute = {
    method: 'GET',
    path: '/init',
    handler: 'admin.init',
    config: {},
  } as any;

  const strapi: any = {
    ...contentAPIDeps,
    admin: {
      routes: {
        admin: { type: 'admin', prefix: '/admin', routes: [adminRoute] },
      },
    },
    apis: {
      foo: {
        routes: {
          'content-api': { type: 'content-api', routes: [apiRoute] },
        },
      },
    },
    plugins: {},
    api(name: string) {
      return strapi.apis[name];
    },
    config: {
      get: (key: string, defaultValue?: unknown) =>
        key === 'api.rest.prefix' ? '/api' : defaultValue,
    },
    server: { routes: createServerRoutesMock() },
  };

  strapi.contentAPI = createContentAPI(strapi);

  return { strapi, apiRoute, adminRoute };
};

describe('registerRoutes — default-path route metadata (regression)', () => {
  it('mutates the SOURCE api route objects in place with info.type and auth scope', () => {
    const { strapi, apiRoute } = buildStrapiMock();

    registerRoutes(strapi);

    // The source api route — the one `getRoutesMap` / users-permissions read —
    // must carry the content-api tag and the generated auth scope.
    expect(apiRoute.info).toBeDefined();
    expect(apiRoute.info.type).toBe('content-api');
    expect(apiRoute.config?.auth?.scope).toEqual(['api::foo.foo.find']);
  });

  it('getRoutesMap() returns content-api routes after registration', async () => {
    const { strapi } = buildStrapiMock();

    registerRoutes(strapi);

    const routesMap = await strapi.contentAPI.getRoutesMap();

    expect(routesMap['api::foo']).toBeDefined();
    expect(routesMap['api::foo']).toHaveLength(1);
    expect(routesMap['api::foo'][0].path).toBe('/api/foos');
  });

  it('re-running registration over the SAME source singletons is idempotent (reload-safe)', () => {
    const { strapi, apiRoute } = buildStrapiMock();

    registerRoutes(strapi);
    // Route definitions from plugins/admin are module-level singletons; if
    // registration runs twice in one process (repeated test setup, or a future
    // in-process reload/HMR), the second pass must not throw `param already
    // exists` and must leave the source deterministically tagged.
    expect(() => registerRoutes(strapi)).not.toThrow();

    expect(apiRoute.info.type).toBe('content-api');
    expect(apiRoute.config?.auth?.scope).toEqual(['api::foo.foo.find']);
  });
});
