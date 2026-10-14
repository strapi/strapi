/**
 * Characterization of the plugin entry as `@strapi/core` consumes it.
 *
 * `@strapi/core` is not a dependency of this package and its loader internals are not exported,
 * so the steps below mirror the core code paths minimally:
 * - entry: `loadPlugins` (`core/src/loaders/plugins/index.ts`) loads the `strapi-server` entry with
 *   `loadConfigFile` (a function export is called with `{ env }`), then spreads it into
 *   `{ ...defaultPlugin, ...pluginServer }` (shallow copy).
 * - user extension: `applyUserExtension` (same file) runs `src/extensions/<plugin>/strapi-server.js`
 *   as `plugins[name] = await strapiServer(plugin)`.
 * - services / controllers: `registries/services.ts` and `registries/controllers.ts` resolve
 *   `typeof value === 'function' ? value({ strapi }) : value`.
 * - routes: `services/server/register-routes.ts` `instantiateRouterInputs` resolves router factories
 *   with `{ strapi }`; `compose-endpoint.ts` resolves `'<controller>.<action>'` handlers on the
 *   resolved controller. Legacy extensions read `plugin.routes['content-api'].routes` before core
 *   resolves the factory (`createContentApiRoutesFactory` getter).
 */
import { env } from '@strapi/utils';

type UnknownRecord = Record<string, unknown>;
type Factory = (params: { strapi: unknown }) => unknown;
type RouteInput = {
  method: string;
  path: string;
  handler: string;
  response?: unknown;
  config?: { policies?: unknown[]; middlewares?: unknown[] };
};
type Router = { type?: string; prefix?: string; routes: RouteInput[] };
type LoadedPlugin = UnknownRecord & {
  contentTypes: Record<string, { schema: { info: { singularName: string } } }>;
  services: UnknownRecord;
  controllers: UnknownRecord;
  routes: UnknownRecord | unknown[];
};
type UserExtension = (plugin: LoadedPlugin) => LoadedPlugin | Promise<LoadedPlugin>;

/**
 * Any access returns a callable stub, so factories that read `strapi` eagerly can be resolved.
 */
const createStub = (): unknown =>
  new Proxy(() => {}, {
    get: (_target, prop) => (prop === 'then' ? undefined : createStub()),
    apply: () => createStub(),
  });

const createStrapiMock = () => {
  return new Proxy({} as UnknownRecord, {
    get: (target, prop) =>
      typeof prop === 'string' && prop in target ? target[prop] : createStub(),
  });
};

const resolveValue = (value: unknown, strapi: unknown) =>
  typeof value === 'function' ? (value as Factory)({ strapi }) : value;

const resolveMap = (map: UnknownRecord, strapi: unknown) => {
  return Object.fromEntries(
    Object.entries(map).map(([name, value]) => [name, resolveValue(value, strapi) as UnknownRecord])
  );
};

/**
 * Function keys as names; object keys (e.g. `permissions.actions`) as nested method lists.
 * Data members (arrays, primitives) are skipped.
 */
const describeMembers = (value: UnknownRecord): unknown[] => {
  return Object.keys(value)
    .sort()
    .flatMap((key): unknown[] => {
      const member = value[key];
      if (typeof member === 'function') {
        return [key];
      }
      if (typeof member === 'object' && member !== null && Array.isArray(member) === false) {
        return [{ [key]: describeMembers(member as UnknownRecord) }];
      }
      return [];
    });
};

const describeMap = (map: Record<string, UnknownRecord>) => {
  return Object.fromEntries(
    Object.entries(map).map(([name, value]) => [name, describeMembers(value)])
  );
};

const resolveRouters = (plugin: LoadedPlugin, strapi: unknown): Record<string, Router> => {
  if (Array.isArray(plugin.routes) === true) {
    return { '': { type: 'admin', routes: plugin.routes as RouteInput[] } };
  }

  return Object.fromEntries(
    Object.entries(plugin.routes).map(([key, value]) => [
      key,
      resolveValue(value, strapi) as Router,
    ])
  );
};

const describeRouters = (routers: Record<string, Router>) => {
  return Object.fromEntries(
    Object.entries(routers).map(([key, router]) => [
      key,
      {
        type: router.type,
        prefix: router.prefix,
        routes: router.routes.map((route) => ({
          method: route.method,
          path: route.path,
          handler: route.handler,
          hasResponseSchema: route.response !== undefined,
          policies: route.config?.policies ?? [],
          middlewareCount: (route.config?.middlewares ?? []).length,
        })),
      },
    ])
  );
};

const loadPluginLikeCore = async (extension?: UserExtension) => {
  const strapi = createStrapiMock();
  global.strapi = strapi as unknown as typeof global.strapi;

  const { default: entry } = await import('../index');
  const pluginServer = typeof entry === 'function' ? (entry as Factory)({ env } as never) : entry;

  let plugin = { ...(pluginServer as UnknownRecord) } as LoadedPlugin;
  if (extension !== undefined) {
    plugin = await extension(plugin);
  }

  return { plugin, strapi };
};

/**
 * Mirrors `compose-endpoint.ts` `getAction`: what the registry serves for a route handler string.
 */
const servedAction = (plugin: LoadedPlugin, handler: string, strapi: unknown) => {
  const [controllerName, actionName] = handler.split('.');
  const controller = resolveValue(plugin.controllers[controllerName], strapi) as UnknownRecord;

  return controller[actionName];
};

describe('i18n plugin entry, as consumed by core', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('exposes the plugin keys and content types', async () => {
    const { plugin } = await loadPluginLikeCore();

    expect(Object.keys(plugin).sort()).toMatchInlineSnapshot(`
      [
        "bootstrap",
        "contentTypes",
        "controllers",
        "register",
        "routes",
        "services",
      ]
    `);
    expect(
      Object.entries(plugin.contentTypes).map(([key, ct]) => [key, ct.schema.info.singularName])
    ).toMatchInlineSnapshot(`
      [
        [
          "locale",
          "locale",
        ],
      ]
    `);
  });

  it('exposes the same services and methods', async () => {
    const { plugin, strapi } = await loadPluginLikeCore();

    expect(describeMap(resolveMap(plugin.services, strapi))).toMatchInlineSnapshot(`
      {
        "ai-localization-jobs": [
          "getJobByContentType",
          "getJobByDocument",
          "upsertJobForDocument",
        ],
        "ai-localizations": [
          "generateDocumentLocalizations",
          "isEnabled",
          "setupMiddleware",
        ],
        "ai-translations": [
          "generateTranslations",
          "hasProvider",
          "registerProvider",
          "registerStrapiManagedProvider",
        ],
        "content-types": [
          "copyNonLocalizedAttributes",
          "fillNonLocalizedAttributes",
          "getLocalizedAttributes",
          "getNestedPopulateOfNonLocalizedAttributes",
          "getNonLocalizedAttributes",
          "getValidLocale",
          "isLocalizedContentType",
        ],
        "fill-from-locale": [
          "fetchRawDocument",
          "transformDocument",
        ],
        "iso-locales": [
          "getIsoLocales",
        ],
        "locales": [
          "count",
          "create",
          "delete",
          "find",
          "findByCode",
          "findById",
          "getDefaultLocale",
          "initDefaultLocale",
          "setDefaultLocale",
          "setIsDefault",
          "update",
        ],
        "localizations": [
          "syncNonLocalizedAttributes",
        ],
        "metrics": [
          "sendDidInitializeEvent",
          "sendDidUpdateI18nLocalesEvent",
        ],
        "permissions": [
          {
            "actions": [
              "normalizeRolePermissionsLocales",
              "registerI18nActions",
              "registerI18nActionsHooks",
              "repairPermissionsForNewlyLocalizedTypes",
              "syncSuperAdminPermissionsWithLocales",
              "updateActionsProperties",
            ],
          },
          {
            "engine": [
              "registerI18nPermissionsHandlers",
              "willRegisterPermission",
            ],
          },
          {
            "sectionsBuilder": [
              "localesPropertyHandler",
              "registerLocalesPropertyHandler",
            ],
          },
        ],
        "sanitize": [
          "sanitizeLocalizationFields",
        ],
        "settings": [
          "getSettings",
          "setSettings",
        ],
      }
    `);
  });

  it('exposes the same controllers and actions', async () => {
    const { plugin, strapi } = await loadPluginLikeCore();

    expect(describeMap(resolveMap(plugin.controllers, strapi))).toMatchInlineSnapshot(`
      {
        "ai-localization-jobs": [
          "getJobForCollectionType",
          "getJobForSingleType",
        ],
        "content-types": [
          "getFillFromLocaleData",
          "getNonLocalizedAttributes",
        ],
        "iso-locales": [
          "listIsoLocales",
        ],
        "locales": [
          "createLocale",
          "deleteLocale",
          "listLocales",
          "updateLocale",
        ],
        "settings": [
          "getSettings",
          "updateSettings",
        ],
      }
    `);
  });

  it('exposes the same routes', async () => {
    const { plugin, strapi } = await loadPluginLikeCore();

    expect(describeRouters(resolveRouters(plugin, strapi))).toMatchInlineSnapshot(`
      {
        "admin": {
          "prefix": undefined,
          "routes": [
            {
              "handler": "iso-locales.listIsoLocales",
              "hasResponseSchema": false,
              "method": "GET",
              "middlewareCount": 0,
              "path": "/iso-locales",
              "policies": [
                "admin::isAuthenticatedAdmin",
                {
                  "config": {
                    "actions": [
                      "plugin::i18n.locale.read",
                    ],
                  },
                  "name": "plugin::content-manager.hasPermissions",
                },
              ],
            },
            {
              "handler": "locales.listLocales",
              "hasResponseSchema": false,
              "method": "GET",
              "middlewareCount": 0,
              "path": "/locales",
              "policies": [
                "admin::isAuthenticatedAdmin",
              ],
            },
            {
              "handler": "locales.createLocale",
              "hasResponseSchema": false,
              "method": "POST",
              "middlewareCount": 0,
              "path": "/locales",
              "policies": [
                "admin::isAuthenticatedAdmin",
                {
                  "config": {
                    "actions": [
                      "plugin::i18n.locale.create",
                    ],
                  },
                  "name": "plugin::content-manager.hasPermissions",
                },
              ],
            },
            {
              "handler": "locales.updateLocale",
              "hasResponseSchema": false,
              "method": "PUT",
              "middlewareCount": 0,
              "path": "/locales/:id",
              "policies": [
                "admin::isAuthenticatedAdmin",
                {
                  "config": {
                    "actions": [
                      "plugin::i18n.locale.update",
                    ],
                  },
                  "name": "plugin::content-manager.hasPermissions",
                },
              ],
            },
            {
              "handler": "locales.deleteLocale",
              "hasResponseSchema": false,
              "method": "DELETE",
              "middlewareCount": 0,
              "path": "/locales/:id",
              "policies": [
                "admin::isAuthenticatedAdmin",
                {
                  "config": {
                    "actions": [
                      "plugin::i18n.locale.delete",
                    ],
                  },
                  "name": "plugin::content-manager.hasPermissions",
                },
              ],
            },
            {
              "handler": "content-types.getNonLocalizedAttributes",
              "hasResponseSchema": false,
              "method": "POST",
              "middlewareCount": 0,
              "path": "/content-manager/actions/get-non-localized-fields",
              "policies": [
                "admin::isAuthenticatedAdmin",
              ],
            },
            {
              "handler": "content-types.getFillFromLocaleData",
              "hasResponseSchema": false,
              "method": "GET",
              "middlewareCount": 0,
              "path": "/content-manager/get-fill-from-locale/:model",
              "policies": [
                "admin::isAuthenticatedAdmin",
                {
                  "config": {
                    "actions": [
                      "plugin::content-manager.explorer.read",
                    ],
                  },
                  "name": "plugin::content-manager.hasPermissions",
                },
              ],
            },
            {
              "handler": "settings.getSettings",
              "hasResponseSchema": false,
              "method": "GET",
              "middlewareCount": 0,
              "path": "/settings",
              "policies": [
                "admin::isAuthenticatedAdmin",
              ],
            },
            {
              "handler": "settings.updateSettings",
              "hasResponseSchema": false,
              "method": "PUT",
              "middlewareCount": 0,
              "path": "/settings",
              "policies": [
                "admin::isAuthenticatedAdmin",
              ],
            },
            {
              "handler": "ai-localization-jobs.getJobForCollectionType",
              "hasResponseSchema": false,
              "method": "GET",
              "middlewareCount": 0,
              "path": "/ai-localization-jobs/collection-types/:contentType/:documentId",
              "policies": [
                "admin::isAuthenticatedAdmin",
              ],
            },
            {
              "handler": "ai-localization-jobs.getJobForSingleType",
              "hasResponseSchema": false,
              "method": "GET",
              "middlewareCount": 0,
              "path": "/ai-localization-jobs/single-types/:contentType",
              "policies": [
                "admin::isAuthenticatedAdmin",
              ],
            },
          ],
          "type": "admin",
        },
        "content-api": {
          "prefix": undefined,
          "routes": [
            {
              "handler": "locales.listLocales",
              "hasResponseSchema": true,
              "method": "GET",
              "middlewareCount": 0,
              "path": "/locales",
              "policies": [],
            },
          ],
          "type": "content-api",
        },
      }
    `);
  });

  it('resolves every route handler to a controller action', async () => {
    const { plugin, strapi } = await loadPluginLikeCore();
    const routes = Object.values(resolveRouters(plugin, strapi)).flatMap((r) => r.routes);

    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect([route.handler, typeof servedAction(plugin, route.handler, strapi)]).toEqual([
        route.handler,
        'function',
      ]);
    }
  });

  it('exposes content-api routes through the legacy getter before core resolves the factory', async () => {
    const { plugin, strapi } = await loadPluginLikeCore();
    const legacyRoutes = (plugin.routes as Record<string, Router>)['content-api'].routes;

    expect(legacyRoutes.map((route) => `${route.method} ${route.path}`)).toEqual(['GET /locales']);
    expect(resolveRouters(plugin, strapi)['content-api'].routes).toBe(legacyRoutes);
  });

  describe('user extension (src/extensions/i18n/strapi-server.js)', () => {
    it.each([
      'locales.listLocales',
      'iso-locales.listIsoLocales',
      'content-types.getNonLocalizedAttributes',
      'settings.getSettings',
    ])('serves %s patched on the plugin object', async (handler) => {
      const [controllerName, actionName] = handler.split('.');
      const patched = jest.fn();
      const { plugin, strapi } = await loadPluginLikeCore((p) => {
        (p.controllers[controllerName] as UnknownRecord)[actionName] = patched;
        return p;
      });

      expect(servedAction(plugin, handler, strapi)).toBe(patched);
    });

    it('serves a service method patched by wrapping the service factory', async () => {
      const patched = jest.fn();
      const { plugin, strapi } = await loadPluginLikeCore((p) => {
        const original = p.services.locales;
        p.services.locales = (params: { strapi: unknown }) => ({
          ...(resolveValue(original, params.strapi) as UnknownRecord),
          find: patched,
        });
        return p;
      });

      const service = resolveMap(plugin.services, strapi).locales;
      expect(service.find).toBe(patched);
      expect(typeof service.setIsDefault).toBe('function');
    });

    it('registers admin routes edited on the plugin object', async () => {
      const { plugin, strapi } = await loadPluginLikeCore((p) => {
        const router = (p.routes as Record<string, Router>).admin;
        router.routes = router.routes.filter((route) => route.handler !== 'locales.deleteLocale');
        router.routes.push({ method: 'GET', path: '/custom', handler: 'locales.listLocales' });
        return p;
      });

      const routes = resolveRouters(plugin, strapi).admin.routes;
      const handlers = routes.map((route) => `${route.method} ${route.path}`);

      expect(handlers).not.toContain('DELETE /locales/:id');
      expect(handlers).toContain('GET /custom');
    });

    it('registers content-api routes edited on the plugin object', async () => {
      const { plugin, strapi } = await loadPluginLikeCore((p) => {
        const router = (p.routes as Record<string, Router>)['content-api'];
        router.routes.push({ method: 'GET', path: '/custom', handler: 'locales.listLocales' });
        return p;
      });

      const routes = resolveRouters(plugin, strapi)['content-api'].routes;

      expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual([
        'GET /locales',
        'GET /custom',
      ]);
    });

    it('registers content-api routes replaced on the plugin object', async () => {
      const { plugin, strapi } = await loadPluginLikeCore((p) => {
        const router = (p.routes as Record<string, Router>)['content-api'];
        router.routes = [{ method: 'GET', path: '/replaced', handler: 'locales.listLocales' }];
        return p;
      });

      const routes = resolveRouters(plugin, strapi)['content-api'].routes;

      expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual(['GET /replaced']);
    });
  });
});
