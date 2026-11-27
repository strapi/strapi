import { describe, expect, test, vi } from 'vitest';
import type { Core } from '@strapi/types';

import registerAllRoutes from '../register-routes';

vi.mock('../openapi', () => ({
  registerOpenAPIRoute: vi.fn(),
}));

type Module = { routes: unknown };

type StrapiMockInput = {
  plugins?: Record<string, Module>;
  apis?: Record<string, Module>;
};

const createStrapi = ({ plugins = {}, apis = {} }: StrapiMockInput) => {
  const serverRoutes = vi.fn();
  const applyExtraParamsToRoutes = vi.fn();

  const strapi = {
    admin: { routes: {} },
    plugins,
    apis,
    api: (name: string) => apis[name],
    server: { routes: serverRoutes },
    contentAPI: { applyExtraParamsToRoutes },
  } as unknown as Core.Strapi;

  return { strapi, serverRoutes, applyExtraParamsToRoutes };
};

const createRoute = (handler: string): Core.RouteInput => ({
  method: 'GET',
  path: `/${handler}`,
  handler,
});

describe('registerPluginRoutes', () => {
  describe('array of routes', () => {
    const setup = () => {
      const first = createRoute('controller.find');
      const second = createRoute('plugin::my-plugin.controller.findOne');
      const routes = [first, second];
      const plugin: Module = { routes };
      const mocks = createStrapi({ plugins: { 'my-plugin': plugin } });

      registerAllRoutes(mocks.strapi);

      return { ...mocks, plugin, routes, first, second };
    };

    test('keeps the plugin array and mutates its route objects in place', () => {
      const { plugin, routes, first, second } = setup();

      expect(plugin.routes).toBe(routes);
      expect(routes).toHaveLength(2);
      expect(routes[0]).toBe(first);
      expect(routes[1]).toBe(second);
    });

    test('sets info.pluginName on each route', () => {
      const { first, second } = setup();

      expect(first.info).toEqual({ pluginName: 'my-plugin' });
      expect(second.info).toEqual({ pluginName: 'my-plugin' });
    });

    test('generates the route scope, prefixing handlers that lack the plugin namespace', () => {
      const { first, second } = setup();

      expect(first.config?.auth).toEqual({ scope: ['plugin::my-plugin.controller.find'] });
      expect(second.config?.auth).toEqual({ scope: ['plugin::my-plugin.controller.findOne'] });
    });

    test('passes the same route array to applyExtraParamsToRoutes and server.routes', () => {
      const { serverRoutes, applyExtraParamsToRoutes, first, second } = setup();

      expect(applyExtraParamsToRoutes).toHaveBeenCalledTimes(1);
      expect(serverRoutes).toHaveBeenCalledTimes(1);

      const [extraParamsRoutes] = applyExtraParamsToRoutes.mock.calls[0];
      const [router] = serverRoutes.mock.calls[0];

      expect(router.routes).toBe(extraParamsRoutes);
      expect(router.routes[0]).toBe(first);
      expect(router.routes[1]).toBe(second);
      expect(router.type).toBe('admin');
      expect(router.prefix).toBe('/my-plugin');
    });
  });

  describe('record of routers', () => {
    const setup = () => {
      const declared: Core.RouterInput = {
        type: 'content-api',
        prefix: '/custom',
        routes: [createRoute('controller.find')],
      };
      const built: Core.Router = { routes: [createRoute('controller.create')] } as Core.Router;
      const factory = vi.fn(() => built);
      const original = { declared, factory };
      const plugin: Module = { routes: original };
      const mocks = createStrapi({ plugins: { 'my-plugin': plugin } });

      registerAllRoutes(mocks.strapi);

      return { ...mocks, plugin, original, declared, built, factory };
    };

    test('replaces plugin.routes with the instantiated routers', () => {
      const { plugin, original, declared, built } = setup();

      expect(plugin.routes).not.toBe(original);
      expect(Object.keys(plugin.routes as object)).toEqual(['declared', 'factory']);
      expect((plugin.routes as Record<string, Core.Router>).declared).toBe(declared);
      expect((plugin.routes as Record<string, Core.Router>).factory).toBe(built);
    });

    test('instantiates router factories with strapi', () => {
      const { factory, strapi } = setup();

      expect(factory).toHaveBeenCalledTimes(1);
      expect(factory).toHaveBeenCalledWith({ strapi });
    });

    test('defaults type to admin and prefix to the plugin name, keeping declared values', () => {
      const { declared, built } = setup();

      expect(declared.type).toBe('content-api');
      expect(declared.prefix).toBe('/custom');
      expect(built.type).toBe('admin');
      expect(built.prefix).toBe('/my-plugin');
    });

    test('sets info.pluginName and the route scope on each route', () => {
      const { declared, built } = setup();

      expect(declared.routes[0].info).toEqual({ pluginName: 'my-plugin' });
      expect(declared.routes[0].config?.auth).toEqual({
        scope: ['plugin::my-plugin.controller.find'],
      });
      expect(built.routes[0].info).toEqual({ pluginName: 'my-plugin' });
      expect(built.routes[0].config?.auth).toEqual({
        scope: ['plugin::my-plugin.controller.create'],
      });
    });

    test('registers each instantiated router and its routes', () => {
      const { serverRoutes, applyExtraParamsToRoutes, declared, built } = setup();

      expect(serverRoutes.mock.calls.map(([router]) => router)).toEqual([declared, built]);
      expect(serverRoutes.mock.calls[0][0]).toBe(declared);
      expect(serverRoutes.mock.calls[1][0]).toBe(built);
      expect(applyExtraParamsToRoutes.mock.calls[0][0]).toBe(declared.routes);
      expect(applyExtraParamsToRoutes.mock.calls[1][0]).toBe(built.routes);
    });
  });
});

describe('registerAPIRoutes', () => {
  const setup = () => {
    const declared: Core.RouterInput = {
      type: 'admin',
      routes: [createRoute('article.find')],
    };
    const built: Core.Router = {
      routes: [createRoute('api::article.article.create')],
    } as Core.Router;
    const factory = vi.fn(() => built);
    const original = { declared, factory };
    const api: Module = { routes: original };
    const mocks = createStrapi({ apis: { article: api } });

    registerAllRoutes(mocks.strapi);

    return { ...mocks, api, original, declared, built, factory };
  };

  test('replaces api.routes with the instantiated routers', () => {
    const { api, original, declared, built, factory, strapi } = setup();

    expect(api.routes).not.toBe(original);
    expect((api.routes as Record<string, Core.Router>).declared).toBe(declared);
    expect((api.routes as Record<string, Core.Router>).factory).toBe(built);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith({ strapi });
  });

  test('forces the content-api type on every router', () => {
    const { declared, built } = setup();

    expect(declared.type).toBe('content-api');
    expect(built.type).toBe('content-api');
  });

  test('sets info.apiName and the route scope on each route', () => {
    const { declared, built } = setup();

    expect(declared.routes[0].info).toEqual({ apiName: 'article' });
    expect(declared.routes[0].config?.auth).toEqual({ scope: ['api::article.article.find'] });
    expect(built.routes[0].info).toEqual({ apiName: 'article' });
    expect(built.routes[0].config?.auth).toEqual({ scope: ['api::article.article.create'] });
  });

  test('registers each instantiated router and its routes', () => {
    const { serverRoutes, applyExtraParamsToRoutes, declared, built } = setup();

    expect(serverRoutes).toHaveBeenCalledTimes(2);
    expect(serverRoutes.mock.calls[0][0]).toBe(declared);
    expect(serverRoutes.mock.calls[1][0]).toBe(built);
    expect(applyExtraParamsToRoutes.mock.calls[0][0]).toBe(declared.routes);
    expect(applyExtraParamsToRoutes.mock.calls[1][0]).toBe(built.routes);
  });
});
