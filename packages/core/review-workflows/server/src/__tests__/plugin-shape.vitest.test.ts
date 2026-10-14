/**
 * Characterization of the plugin entry as `@strapi/core` consumes it.
 *
 * `@strapi/core` is not a dependency of this package and its loader internals are not exported,
 * so the steps below mirror the core code paths minimally:
 * - entry: `loadPlugins` (`core/src/loaders/plugins/index.ts`) requires the `strapi-server` entry
 *   once, then spreads it into `{ ...defaultPlugin, ...pluginServer }` (shallow copy).
 * - user extension: `applyUserExtension` (same file) runs `src/extensions/<plugin>/strapi-server.js`
 *   as `plugins[name] = await strapiServer(plugin)`.
 * - services / controllers: `registries/services.ts` and `registries/controllers.ts` resolve
 *   `typeof value === 'function' ? value({ strapi }) : value`.
 * - routes: `services/server/register-routes.ts` `instantiateRouterInputs` resolves router factories
 *   with `{ strapi }`; `compose-endpoint.ts` resolves `'<controller>.<action>'` handlers on the
 *   resolved controller; `middleware.ts` `resolveMiddlewares` resolves route middlewares.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type UnknownRecord = Record<string, unknown>;
type Factory = (params: { strapi: unknown }) => unknown;
type RouteMiddleware = (ctx: { status?: number }, next: () => unknown) => unknown;
type RouteInput = {
  method: string;
  path: string;
  handler: string;
  info?: unknown;
  config?: { policies?: unknown[]; middlewares?: unknown[] };
};
type Router = { type?: string; prefix?: string; routes: RouteInput[] };
type LoadedPlugin = UnknownRecord & {
  contentTypes: Record<string, { schema: { info: { singularName: string } } }>;
  services: UnknownRecord;
  controllers: UnknownRecord;
  middlewares?: UnknownRecord;
  routes: UnknownRecord | unknown[];
};
type UserExtension = (plugin: LoadedPlugin) => LoadedPlugin | Promise<LoadedPlugin>;

const PLUGIN_NAMESPACE = 'plugin::review-workflows';

/**
 * A strapi mock where only the feature gate is real; any other access returns a callable stub,
 * so factories that read `strapi` eagerly can be resolved.
 */
const createStub = (): unknown =>
  new Proxy(() => {}, {
    get: (_target, prop) => (prop === 'then' ? undefined : createStub()),
    apply: () => createStub(),
  });

const createStrapiMock = (featureEnabled: { value: boolean }) => {
  const known: UnknownRecord = {
    ee: { features: { isEnabled: vi.fn(() => featureEnabled.value) } },
  };

  return new Proxy(known, {
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

const methodNames = (map: Record<string, UnknownRecord>) => {
  return Object.fromEntries(
    Object.entries(map).map(([name, value]) => [
      name,
      Object.keys(value)
        .filter((key) => typeof value[key] === 'function')
        .sort(),
    ])
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

const resolveMiddleware = (
  plugin: LoadedPlugin,
  item: unknown,
  strapi: unknown
): RouteMiddleware => {
  if (typeof item === 'function') {
    return item as RouteMiddleware;
  }

  const { name, config } =
    typeof item === 'string'
      ? { name: item, config: {} }
      : (item as { name: string; config: unknown });
  const localName = name.replace(`${PLUGIN_NAMESPACE}.`, '');
  const factory = plugin.middlewares?.[localName];

  if (typeof factory !== 'function') {
    throw new Error(`Middleware ${name} not found.`);
  }

  return factory(config, { strapi }) as RouteMiddleware;
};

const policyName = (policy: unknown) => {
  return typeof policy === 'string' ? policy : (policy as { name: string }).name;
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
          info: route.info,
          policies: (route.config?.policies ?? []).map(policyName),
          middlewareCount: (route.config?.middlewares ?? []).length,
        })),
      },
    ])
  );
};

const loadPluginLikeCore = async (featureEnabled: boolean, extension?: UserExtension) => {
  const gate = { value: featureEnabled };
  const strapi = createStrapiMock(gate);
  vi.stubGlobal('strapi', strapi);

  const { default: pluginServer } = await import('../index');

  let plugin = { ...pluginServer } as unknown as LoadedPlugin;
  if (extension !== undefined) {
    plugin = await extension(plugin);
  }

  return { plugin, strapi, gate };
};

/**
 * Mirrors `compose-endpoint.ts` `getAction`: what the registry serves for a route handler string.
 */
const servedAction = (plugin: LoadedPlugin, handler: string, strapi: unknown) => {
  const [controllerName, actionName] = handler.split('.');
  const controller = resolveValue(plugin.controllers[controllerName], strapi) as UnknownRecord;

  return controller[actionName];
};

describe('review-workflows plugin entry, as consumed by core', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('feature enabled', () => {
    it('exposes the full plugin', async () => {
      const { plugin } = await loadPluginLikeCore(true);

      expect(Object.keys(plugin).sort()).toMatchInlineSnapshot(`
        [
          "bootstrap",
          "contentTypes",
          "controllers",
          "destroy",
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
            "workflow",
            "workflow",
          ],
          [
            "workflow-stage",
            "workflow-stage",
          ],
        ]
      `);
    });

    it('exposes the same services and methods', async () => {
      const { plugin, strapi } = await loadPluginLikeCore(true);

      expect(methodNames(resolveMap(plugin.services, strapi))).toMatchInlineSnapshot(`
        {
          "assignees": [
            "findEntityAssigneeId",
            "updateEntityAssignee",
          ],
          "document-service-middlewares": [
            "assignStageOnCreate",
            "checkStageBeforePublish",
            "handleStageOnUpdate",
          ],
          "homepage": [
            "getRecentlyAssignedDocuments",
          ],
          "stage-permissions": [
            "can",
            "canTransitionToStage",
            "canTransitionToStageWithPermissions",
            "register",
            "registerMany",
            "registerManyTo",
            "registerTo",
            "unregister",
          ],
          "stages": [
            "count",
            "createMany",
            "delete",
            "deleteAllEntitiesStage",
            "deleteMany",
            "deleteStagePermissions",
            "find",
            "findById",
            "replaceStages",
            "update",
            "updateEntitiesStage",
            "updateEntity",
          ],
          "validation": [
            "register",
            "validateWorkflowCount",
            "validateWorkflowCountStages",
            "validateWorkflowStages",
          ],
          "workflow-metrics": [
            "sendDidChangeEntryStage",
            "sendDidCreateStage",
            "sendDidCreateWorkflow",
            "sendDidDeleteStage",
            "sendDidEditAssignee",
            "sendDidEditStage",
            "sendDidEditWorkflow",
            "sendDidSendReviewWorkflowPropertiesOnceAWeek",
          ],
          "workflow-weekly-metrics": [
            "computeMetrics",
            "ensureWeeklyStoredCronSchedule",
            "registerCron",
            "sendMetrics",
          ],
          "workflows": [
            "_getAssignedWorkflows",
            "assertContentTypeBelongsToWorkflow",
            "assertStageBelongsToWorkflow",
            "count",
            "create",
            "delete",
            "find",
            "findById",
            "getAssignedWorkflow",
            "update",
          ],
        }
      `);
    });

    it('exposes the same controllers and actions', async () => {
      const { plugin, strapi } = await loadPluginLikeCore(true);

      expect(methodNames(resolveMap(plugin.controllers, strapi))).toMatchInlineSnapshot(`
        {
          "assignees": [
            "updateEntity",
          ],
          "homepage": [
            "getRecentlyAssignedDocuments",
          ],
          "stages": [
            "find",
            "findById",
            "listAvailableStages",
            "updateEntity",
          ],
          "workflows": [
            "create",
            "delete",
            "find",
            "update",
          ],
        }
      `);
    });

    it('exposes the same routes', async () => {
      const { plugin, strapi } = await loadPluginLikeCore(true);

      expect(describeRouters(resolveRouters(plugin, strapi))).toMatchInlineSnapshot(`
        {
          "homepage": {
            "prefix": undefined,
            "routes": [
              {
                "handler": "homepage.getRecentlyAssignedDocuments",
                "info": {
                  "pluginName": "content-manager",
                  "type": "admin",
                },
                "method": "GET",
                "middlewareCount": 0,
                "path": "/homepage/recently-assigned-documents",
                "policies": [
                  "admin::isAuthenticatedAdmin",
                ],
              },
            ],
            "type": "admin",
          },
          "review-workflows": {
            "prefix": undefined,
            "routes": [
              {
                "handler": "workflows.create",
                "info": undefined,
                "method": "POST",
                "middlewareCount": 1,
                "path": "/workflows",
                "policies": [
                  "admin::isAuthenticatedAdmin",
                  "admin::hasPermissions",
                ],
              },
              {
                "handler": "workflows.update",
                "info": undefined,
                "method": "PUT",
                "middlewareCount": 1,
                "path": "/workflows/:id",
                "policies": [
                  "admin::isAuthenticatedAdmin",
                  "admin::hasPermissions",
                ],
              },
              {
                "handler": "workflows.delete",
                "info": undefined,
                "method": "DELETE",
                "middlewareCount": 1,
                "path": "/workflows/:id",
                "policies": [
                  "admin::isAuthenticatedAdmin",
                  "admin::hasPermissions",
                ],
              },
              {
                "handler": "workflows.find",
                "info": undefined,
                "method": "GET",
                "middlewareCount": 1,
                "path": "/workflows",
                "policies": [
                  "admin::isAuthenticatedAdmin",
                  "admin::hasPermissions",
                ],
              },
              {
                "handler": "stages.find",
                "info": undefined,
                "method": "GET",
                "middlewareCount": 1,
                "path": "/workflows/:workflow_id/stages",
                "policies": [
                  "admin::isAuthenticatedAdmin",
                  "admin::hasPermissions",
                ],
              },
              {
                "handler": "stages.findById",
                "info": undefined,
                "method": "GET",
                "middlewareCount": 1,
                "path": "/workflows/:workflow_id/stages/:id",
                "policies": [
                  "admin::isAuthenticatedAdmin",
                  "admin::hasPermissions",
                ],
              },
              {
                "handler": "stages.updateEntity",
                "info": undefined,
                "method": "PUT",
                "middlewareCount": 1,
                "path": "/content-manager/(collection|single)-types/:model_uid/:id/stage",
                "policies": [
                  "admin::isAuthenticatedAdmin",
                ],
              },
              {
                "handler": "stages.listAvailableStages",
                "info": undefined,
                "method": "GET",
                "middlewareCount": 1,
                "path": "/content-manager/(collection|single)-types/:model_uid/:id/stages",
                "policies": [
                  "admin::isAuthenticatedAdmin",
                ],
              },
              {
                "handler": "assignees.updateEntity",
                "info": undefined,
                "method": "PUT",
                "middlewareCount": 1,
                "path": "/content-manager/(collection|single)-types/:model_uid/:id/assignee",
                "policies": [
                  "admin::isAuthenticatedAdmin",
                  "admin::hasPermissions",
                ],
              },
            ],
            "type": "admin",
          },
        }
      `);
    });

    it('resolves every route handler to a controller action', async () => {
      const { plugin, strapi } = await loadPluginLikeCore(true);
      const routes = Object.values(resolveRouters(plugin, strapi)).flatMap((r) => r.routes);

      expect(routes.length).toBeGreaterThan(0);
      for (const route of routes) {
        expect(typeof servedAction(plugin, route.handler, strapi)).toBe('function');
      }
    });

    it('route middlewares 404 once the feature is disabled at runtime', async () => {
      const { plugin, strapi, gate } = await loadPluginLikeCore(true);
      const routes = Object.values(resolveRouters(plugin, strapi)).flatMap((r) => r.routes);
      const middlewares = routes.flatMap((route) =>
        (route.config?.middlewares ?? []).map((item) => resolveMiddleware(plugin, item, strapi))
      );

      expect(middlewares.length).toBe(9);
      for (const middleware of middlewares) {
        const enabledCtx: { status?: number } = {};
        const enabledNext = vi.fn();
        gate.value = true;
        await middleware(enabledCtx, enabledNext);
        expect(enabledNext).toHaveBeenCalledTimes(1);
        expect(enabledCtx.status).toBe(undefined);

        const disabledCtx: { status?: number } = {};
        const disabledNext = vi.fn();
        gate.value = false;
        await middleware(disabledCtx, disabledNext);
        expect(disabledNext).not.toHaveBeenCalled();
        expect(disabledCtx.status).toBe(404);
      }
    });
  });

  describe('feature disabled', () => {
    it('only keeps content types and register', async () => {
      const { plugin } = await loadPluginLikeCore(false);

      expect(Object.keys(plugin).sort()).toMatchInlineSnapshot(`
        [
          "contentTypes",
          "register",
        ]
      `);
      expect(Object.keys(plugin.contentTypes)).toMatchInlineSnapshot(`
        [
          "workflow",
          "workflow-stage",
        ]
      `);
      expect(plugin.services).toBe(undefined);
      expect(plugin.controllers).toBe(undefined);
      expect(plugin.routes).toBe(undefined);
    });
  });

  describe('user extension (src/extensions/review-workflows/strapi-server.js)', () => {
    it('serves a controller action patched on the plugin object', async () => {
      const patched = vi.fn();
      const { plugin, strapi } = await loadPluginLikeCore(true, (p) => {
        (p.controllers.workflows as UnknownRecord).find = patched;
        return p;
      });

      expect(servedAction(plugin, 'workflows.find', strapi)).toBe(patched);
      expect(typeof servedAction(plugin, 'workflows.create', strapi)).toBe('function');
    });

    it('registers routes edited on the plugin object', async () => {
      const { plugin, strapi } = await loadPluginLikeCore(true, (p) => {
        const router = (p.routes as Record<string, Router>)['review-workflows'];
        router.routes = router.routes.filter((route) => route.handler !== 'workflows.delete');
        router.routes.push({ method: 'GET', path: '/custom', handler: 'workflows.find' });
        return p;
      });

      const router = resolveRouters(plugin, strapi)['review-workflows'];
      const handlers = router.routes.map((route) => `${route.method} ${route.path}`);

      expect(handlers).not.toContain('DELETE /workflows/:id');
      expect(handlers).toContain('GET /custom');
    });
  });

  /**
   * User extensions receive the raw plugin object, before the core registries resolve factories.
   * A value that is a plain object on develop can be patched in place (`plugin.services.x.fn = ...`);
   * a factory can only be wrapped. Turning a plain object into a factory, or the reverse, silently
   * breaks existing extensions, so each entry pins the develop shape through the extension path.
   */
  describe('user extension patching keeps the develop shape', () => {
    type Entry = [name: string, method: string];

    const plainServices: Entry[] = [['workflow-metrics', 'sendDidCreateStage']];
    const factoryServices: Entry[] = [
      ['assignees', 'updateEntityAssignee'],
      ['document-service-middlewares', 'assignStageOnCreate'],
      ['homepage', 'getRecentlyAssignedDocuments'],
      ['stage-permissions', 'can'],
      ['stages', 'find'],
      ['validation', 'validateWorkflowCount'],
      ['workflow-weekly-metrics', 'sendMetrics'],
      ['workflows', 'find'],
    ];
    const plainControllers: Entry[] = [
      ['assignees', 'updateEntity'],
      ['stages', 'find'],
      ['workflows', 'find'],
    ];
    const factoryControllers: Entry[] = [['homepage', 'getRecentlyAssignedDocuments']];

    const names = (entries: Entry[]) => entries.map(([name]) => name).sort();

    const patchInPlace = (key: 'services' | 'controllers', name: string, method: string) => {
      const patched = vi.fn();
      const extension: UserExtension = (p) => {
        (p[key][name] as UnknownRecord)[method] = patched;
        return p;
      };

      return { patched, extension };
    };

    const wrapFactory = (key: 'services' | 'controllers', name: string, method: string) => {
      const patched = vi.fn();
      const extension: UserExtension = (p) => {
        const factory = p[key][name] as Factory;
        p[key][name] = (params: { strapi: unknown }) => ({
          ...(factory(params) as UnknownRecord),
          [method]: patched,
        });
        return p;
      };

      return { patched, extension };
    };

    it('lists every service and controller exposed on the plugin object', async () => {
      const { plugin } = await loadPluginLikeCore(true);

      expect(Object.keys(plugin.services).sort()).toEqual(
        names([...plainServices, ...factoryServices])
      );
      expect(Object.keys(plugin.controllers).sort()).toEqual(
        names([...plainControllers, ...factoryControllers])
      );
      expect(plugin.policies).toBe(undefined);
      expect(plugin.middlewares).toBe(undefined);
    });

    it.each(plainServices)('serves %s.%s patched on the plain service object', async (n, m) => {
      const { patched, extension } = patchInPlace('services', n, m);
      const { plugin, strapi } = await loadPluginLikeCore(true, extension);

      expect((resolveValue(plugin.services[n], strapi) as UnknownRecord)[m]).toBe(patched);
      expect(typeof plugin.services[n]).toBe('object');
    });

    it.each(factoryServices)('serves %s.%s from a wrapped service factory', async (n, m) => {
      const { patched, extension } = wrapFactory('services', n, m);
      const { plugin, strapi } = await loadPluginLikeCore(true, extension);

      expect((resolveValue(plugin.services[n], strapi) as UnknownRecord)[m]).toBe(patched);
    });

    it.each(plainControllers)('serves %s.%s patched on the plain controller', async (n, m) => {
      const { patched, extension } = patchInPlace('controllers', n, m);
      const { plugin, strapi } = await loadPluginLikeCore(true, extension);

      expect(servedAction(plugin, `${n}.${m}`, strapi)).toBe(patched);
      expect(typeof plugin.controllers[n]).toBe('object');
    });

    it.each(factoryControllers)('serves %s.%s from a wrapped controller factory', async (n, m) => {
      const { patched, extension } = wrapFactory('controllers', n, m);
      const { plugin, strapi } = await loadPluginLikeCore(true, extension);

      expect(servedAction(plugin, `${n}.${m}`, strapi)).toBe(patched);
    });
  });
});
