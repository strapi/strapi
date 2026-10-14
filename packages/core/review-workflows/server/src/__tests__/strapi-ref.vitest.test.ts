/**
 * Plain-object modules (controllers, route middlewares, `workflow-metrics`) read `strapi` from a
 * plugin-scoped binding. These tests pin which instance they get: the one core handed to the plugin
 * (`register`, `bootstrap`, service factories) over a different global, and the global when nothing
 * was bound. Core is mirrored like in plugin-shape.vitest.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type UnknownRecord = Record<string, unknown>;
type Factory = (params: { strapi: unknown }) => unknown;
type Action = (ctx: UnknownRecord) => Promise<unknown>;
type RouteMiddleware = (ctx: { status?: number }, next: () => unknown) => unknown;
type Router = { routes: { config?: { middlewares?: unknown[] } }[] };
type LoadedPlugin = {
  register: (params: { strapi: unknown }) => unknown;
  bootstrap: (params: { strapi: unknown }) => unknown;
  services: UnknownRecord;
  controllers: UnknownRecord;
  routes: Record<string, Router>;
};
type UserExtension = (plugin: LoadedPlugin) => LoadedPlugin;

/**
 * Any access returns a callable stub, so `bootstrap` can run without a real instance.
 */
const createStub = (): unknown =>
  new Proxy(() => {}, {
    get: (_target, prop) => (prop === 'then' ? undefined : createStub()),
    apply: () => createStub(),
  });

const resolveValue = (value: unknown, strapi: unknown) =>
  typeof value === 'function' ? (value as Factory)({ strapi }) : value;

/**
 * A strapi instance whose `review-workflows` services come from the loaded plugin, resolved like the
 * core service registry, except `stages` which is a spy. Other accesses return stubs so `register`
 * can run.
 */
const createStrapiMock = (featureEnabled: boolean) => {
  const plugin: { current?: LoadedPlugin } = {};
  const instances: UnknownRecord = {};
  const stages = { find: vi.fn(async () => [{ id: 1 }]) };
  const permissionChecker = { sanitizeOutput: vi.fn(async (entity: unknown) => entity) };
  const telemetry = { send: vi.fn() };

  const known: UnknownRecord = {
    ee: {
      features: { isEnabled: vi.fn(() => featureEnabled), get: vi.fn(() => undefined) },
      entitlements: { register: vi.fn() },
    },
    telemetry,
    plugin: vi.fn((name: string) => ({
      service(serviceName: string) {
        if (name === 'content-manager') {
          return { create: () => permissionChecker };
        }
        if (serviceName === 'stages') {
          return stages;
        }
        if (instances[serviceName] === undefined) {
          instances[serviceName] = resolveValue(plugin.current?.services[serviceName], strapi);
        }
        return instances[serviceName];
      },
    })),
  };
  const strapi: UnknownRecord = new Proxy(known, {
    get: (target, prop) =>
      typeof prop === 'string' && prop in target ? target[prop] : createStub(),
  });

  return { strapi, plugin, stages, telemetry };
};

type StrapiMock = ReturnType<typeof createStrapiMock>;

/**
 * Mirrors `loadPlugins` + `applyUserExtension`: the entry is required with the global `strapi`
 * (feature gate), spread, then handed to the user extension.
 */
const loadPluginLikeCore = async (mock: StrapiMock, extension?: UserExtension) => {
  vi.stubGlobal('strapi', mock.strapi);
  const { default: pluginServer } = await import('../index');
  const strapiRef = await import('../utils/strapi-ref');

  let plugin = { ...pluginServer } as unknown as LoadedPlugin;
  if (extension !== undefined) {
    plugin = extension(plugin);
  }
  mock.plugin.current = plugin;

  return { plugin, strapiRef };
};

const servedAction = (plugin: LoadedPlugin, handler: string, strapi: unknown) => {
  const [controllerName, actionName] = handler.split('.');
  const controller = resolveValue(plugin.controllers[controllerName], strapi) as UnknownRecord;

  return controller[actionName] as Action;
};

const findStages = async (plugin: LoadedPlugin, strapi: unknown) => {
  const ctx: UnknownRecord = { params: { workflow_id: 1 }, query: {}, state: { userAbility: {} } };
  await servedAction(plugin, 'stages.find', strapi)(ctx);

  return ctx;
};

const replaceRegister: UserExtension = (p) => {
  p.register = vi.fn();
  return p;
};

describe('review-workflows plugin-scoped strapi binding', () => {
  let app: StrapiMock;
  let decoy: StrapiMock;

  beforeEach(() => {
    vi.resetModules();
    app = createStrapiMock(true);
    decoy = createStrapiMock(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to the global strapi when nothing is bound', async () => {
    const { plugin, strapiRef } = await loadPluginLikeCore(app);

    expect(strapiRef.getStrapi()).toBe(app.strapi);
    expect((await findStages(plugin, app.strapi)).body).toEqual({ data: [{ id: 1 }] });
    expect(app.stages.find).toHaveBeenCalledTimes(1);
  });

  it('serves the instance bound by register over a different global', async () => {
    const { plugin, strapiRef } = await loadPluginLikeCore(app);
    await plugin.register({ strapi: app.strapi });
    vi.stubGlobal('strapi', decoy.strapi);

    expect(strapiRef.getStrapi()).toBe(app.strapi);
    await findStages(plugin, app.strapi);
    expect(app.stages.find).toHaveBeenCalledTimes(1);
    expect(decoy.stages.find).not.toHaveBeenCalled();
  });

  it('reads the bound instance in route middlewares and metrics', async () => {
    const { plugin } = await loadPluginLikeCore(app);
    await plugin.register({ strapi: app.strapi });
    vi.stubGlobal('strapi', decoy.strapi);

    const [middleware] = plugin.routes['review-workflows'].routes[0].config?.middlewares ?? [];
    const next = vi.fn();
    await (middleware as RouteMiddleware)({}, next);
    expect(next).toHaveBeenCalledTimes(1);

    const metrics = resolveValue(plugin.services['workflow-metrics'], app.strapi) as UnknownRecord;
    await (metrics.sendDidCreateStage as () => Promise<void>)();
    expect(app.telemetry.send).toHaveBeenCalledWith('didCreateStage', {});
    expect(decoy.telemetry.send).not.toHaveBeenCalled();
  });

  it('is bound by a service factory when an extension replaces register', async () => {
    const { plugin, strapiRef } = await loadPluginLikeCore(app, replaceRegister);
    await plugin.register({ strapi: app.strapi });
    vi.stubGlobal('strapi', decoy.strapi);
    expect(strapiRef.getStrapi()).toBe(decoy.strapi);

    // `initRouting` resolves `homepage.getRecentlyAssignedDocuments`: the controller factory
    // instantiates the homepage service through the registry
    servedAction(plugin, 'homepage.getRecentlyAssignedDocuments', app.strapi);

    expect(strapiRef.getStrapi()).toBe(app.strapi);
    await findStages(plugin, app.strapi);
    expect(app.stages.find).toHaveBeenCalledTimes(1);
    expect(decoy.stages.find).not.toHaveBeenCalled();
  });

  it('is bound by bootstrap when an extension replaces register', async () => {
    const { plugin, strapiRef } = await loadPluginLikeCore(app, replaceRegister);
    await plugin.register({ strapi: app.strapi });
    const bootstrapped = createStub();

    await plugin.bootstrap({ strapi: bootstrapped });

    expect(strapiRef.getStrapi()).toBe(bootstrapped);
  });

  it('still serves a controller action patched by an extension', async () => {
    const patched = vi.fn();
    const { plugin } = await loadPluginLikeCore(app, (p) => {
      (p.controllers.stages as UnknownRecord).find = patched;
      return replaceRegister(p);
    });
    await plugin.register({ strapi: app.strapi });

    expect(servedAction(plugin, 'stages.find', app.strapi)).toBe(patched);
  });
});
