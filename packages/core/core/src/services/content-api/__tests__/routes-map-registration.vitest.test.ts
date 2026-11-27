import os from 'os';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createContentApiRoutesFactory } from '@strapi/utils';

import createContentAPI from '..';
import { createServer } from '../../server';

type TestApp = {
  plugins: Record<string, { routes: unknown }>;
  apis: Record<string, { routes: unknown }>;
  contentAPI: ReturnType<typeof createContentAPI>;
  server: ReturnType<typeof createServer>;
  log: { warn: ReturnType<typeof vi.fn>; error: () => void };
};

const route = (path: string) => ({ method: 'GET', path, handler: () => undefined });

const apps: TestApp[] = [];

/**
 * A Strapi app reduced to what route registration and `getRoutesMap` read. Its routes go through
 * the real `server.initRouting()`.
 */
const createApp = ({
  plugins = {},
  apis = {},
}: Pick<Partial<TestApp>, 'plugins' | 'apis'> = {}): TestApp => {
  const app: any = {
    config: {
      get(key: string, defaultValue?: unknown) {
        if (key === 'api.rest.prefix') {
          return '/api';
        }

        return key === 'environment' ? 'development' : defaultValue;
      },
    },
    get: (name: string) => (name === 'policies' ? { resolve: () => [] } : undefined),
    log: { warn: vi.fn(), error: () => undefined },
    dirs: { app: { root: os.tmpdir() } },
    admin: { routes: {} },
    plugins,
    apis,
    api: (name: string) => apis[name],
  };

  app.contentAPI = createContentAPI(app);
  app.server = createServer(app);
  apps.push(app);

  return app;
};

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.server.destroy()));
});

describe('getRoutesMap and route registration', () => {
  test('lists the content API routes of plugins and APIs after initRouting, without mount (load-only CLI)', async () => {
    const app = createApp({
      plugins: {
        foo: { routes: { 'content-api': createContentApiRoutesFactory(() => [route('/bar')]) } },
      },
      apis: {
        article: { routes: { article: { type: 'content-api', routes: [route('/articles')] } } },
      },
    });

    app.server.initRouting();

    const routesMap = await app.contentAPI.getRoutesMap();

    expect(Object.keys(routesMap)).toEqual(['api::article', 'plugin::foo']);
    expect(routesMap['api::article']).toEqual([
      expect.objectContaining({
        path: '/api/articles',
        info: { apiName: 'article', type: 'content-api' },
      }),
    ]);
    expect(routesMap['plugin::foo']).toEqual([
      expect.objectContaining({
        path: '/api/foo/bar',
        info: { pluginName: 'foo', type: 'content-api' },
      }),
    ]);
    expect(app.log.warn).not.toHaveBeenCalled();
  });

  test('skips and warns once about a route pushed into a plugin router after initRouting: it is never served', async () => {
    const app = createApp({
      plugins: {
        foo: { routes: { 'content-api': createContentApiRoutesFactory(() => [route('/bar')]) } },
      },
    });

    app.server.initRouting();
    (app.plugins.foo.routes as any)['content-api'].routes.push(route('/late'));

    const routesMap = await app.contentAPI.getRoutesMap();
    await app.contentAPI.getRoutesMap();

    expect(routesMap['plugin::foo'].map((r) => r.path)).toEqual(['/api/foo/bar']);
    expect(app.log.warn).toHaveBeenCalledTimes(1);
    expect(app.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Route "GET /late" of plugin::foo (router "content-api")')
    );
  });

  test('skips and warns once about a route pushed into an API router after initRouting: it is never served', async () => {
    const app = createApp({
      apis: {
        article: { routes: { article: { type: 'content-api', routes: [route('/articles')] } } },
      },
    });

    app.server.initRouting();
    (app.apis.article.routes as any).article.routes.push(route('/late'));

    const routesMap = await app.contentAPI.getRoutesMap();
    await app.contentAPI.getRoutesMap();

    expect(routesMap['api::article'].map((r) => r.path)).toEqual(['/api/articles']);
    expect(app.log.warn).toHaveBeenCalledTimes(1);
    expect(app.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Route "GET /late" of api::article (router "article")')
    );
  });

  test('reads an API router declared as an array of routes, which is served on the root router', async () => {
    const app = createApp({
      apis: {
        article: {
          routes: {
            article: { type: 'content-api', routes: [route('/articles')] },
            custom: [route('/custom-articles')],
          },
        },
      },
    });

    app.server.initRouting();

    const routesMap = await app.contentAPI.getRoutesMap();

    // The array is registered as-is on the root router (`info.type: 'api'`), not on the content API
    expect(app.server.listRoutes().map((layer) => layer.path)).toContain('/custom-articles');
    expect(routesMap['api::article'].map((r) => r.path)).toEqual(['/api/articles']);
  });

  test('keeps an API router declared as an array: same array, content API type, routes without API info', () => {
    const custom = [route('/custom-articles')];
    const app = createApp({ apis: { article: { routes: { custom } } } });

    app.server.initRouting();

    expect(Reflect.get(Object(app.apis.article.routes), 'custom')).toBe(custom);
    expect(Reflect.get(custom, 'type')).toBe('content-api');
    expect(custom.map((r) => Reflect.get(r, 'info'))).toEqual([{ type: 'api' }]);
  });

  test('returns an empty map for an app without content API routes, after initRouting', async () => {
    const app = createApp();

    app.server.initRouting();

    await expect(app.contentAPI.getRoutesMap()).resolves.toEqual({});
  });

  test('rejects with a clear error when called before initRouting', async () => {
    const app = createApp({
      plugins: {
        foo: { routes: { 'content-api': createContentApiRoutesFactory(() => [route('/bar')]) } },
      },
    });

    await expect(app.contentAPI.getRoutesMap()).rejects.toThrow(
      'contentAPI.getRoutesMap() called before routes are registered'
    );
  });

  test('rejects with a clear error when called before initRouting, for an app without routes', async () => {
    const app = createApp();

    await expect(app.contentAPI.getRoutesMap()).rejects.toThrow(
      'contentAPI.getRoutesMap() called before routes are registered'
    );
  });
});
