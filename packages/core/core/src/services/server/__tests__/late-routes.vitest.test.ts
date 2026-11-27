import os from 'os';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createContentApiRoutesFactory } from '@strapi/utils';

import createContentAPI from '../../content-api';
import { createServer } from '..';
import { warnAboutRoutesAddedAfterRouting } from '../late-routes';

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
 * A Strapi app reduced to what route registration reads. Its routes go through the real
 * `server.initRouting()`.
 */
const createApp = ({
  plugins = {},
  apis = {},
  environment = 'development',
}: Pick<Partial<TestApp>, 'plugins' | 'apis'> & { environment?: string } = {}): TestApp => {
  const config: Record<string, unknown> = { environment, 'api.rest.prefix': '/api' };
  const app: any = {
    config: {
      get: (key: string, defaultValue?: unknown) => config[key] ?? defaultValue,
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

const createAppWithRoutes = (environment?: string) =>
  createApp({
    environment,
    plugins: {
      foo: { routes: { 'content-api': createContentApiRoutesFactory(() => [route('/bar')]) } },
      legacy: { routes: [route('/legacy')] },
    },
    apis: {
      article: { routes: { article: { type: 'content-api', routes: [route('/articles')] } } },
    },
  });

const pushLateRoutes = (app: TestApp) => {
  (app.plugins.foo.routes as any)['content-api'].routes.push(route('/late'));
  (app.plugins.legacy.routes as any).push(route('/late-legacy'));
  (app.apis.article.routes as any).article.routes.push(route('/late-articles'));
};

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.server.destroy()));
});

describe('warnAboutRoutesAddedAfterRouting', () => {
  test('does not warn when every route was declared before initRouting', () => {
    const app = createAppWithRoutes();

    app.server.initRouting();
    warnAboutRoutesAddedAfterRouting(app as any);

    expect(app.log.warn).not.toHaveBeenCalled();
  });

  test('does not warn about an API router declared as an array, which is served on the root router', () => {
    const app = createApp({
      apis: { article: { routes: { custom: [route('/custom-articles')] } } },
    });

    app.server.initRouting();
    warnAboutRoutesAddedAfterRouting(app as any);

    expect(app.server.listRoutes().map((layer) => layer.path)).toContain('/custom-articles');
    expect(app.log.warn).not.toHaveBeenCalled();
  });

  test('keeps routes pushed before initRouting served and silent', () => {
    const app = createAppWithRoutes();

    pushLateRoutes(app);
    app.server.initRouting();
    warnAboutRoutesAddedAfterRouting(app as any);

    expect(app.log.warn).not.toHaveBeenCalled();
    expect(
      app.server
        .api('content-api')
        .listRoutes()
        .map((layer) => layer.path)
    ).toEqual(expect.arrayContaining(['/api/foo/late', '/api/late-articles']));
  });

  test('does not warn before initRouting', () => {
    const app = createAppWithRoutes();

    pushLateRoutes(app);
    warnAboutRoutesAddedAfterRouting(app as any);

    expect(app.log.warn).not.toHaveBeenCalled();
  });

  test('warns once per route pushed into a plugin or API router after initRouting', () => {
    const app = createAppWithRoutes();

    app.server.initRouting();
    pushLateRoutes(app);
    warnAboutRoutesAddedAfterRouting(app as any);
    warnAboutRoutesAddedAfterRouting(app as any);

    expect(app.log.warn.mock.calls.map(([message]) => message)).toEqual([
      expect.stringContaining('Route "GET /late-articles" of api::article (router "article")'),
      expect.stringContaining('Route "GET /late" of plugin::foo (router "content-api")'),
      expect.stringContaining('Route "GET /late-legacy" of plugin::legacy was registered'),
    ]);
    expect(app.log.warn).toHaveBeenCalledWith(
      '[strapi] Route "GET /late" of plugin::foo (router "content-api") was registered after Strapi registered the routes (server.initRouting(), in the bootstrap phase, before the bootstrap functions of plugins and APIs): Strapi does not serve it, and contentAPI.getRoutesMap() does not list it. Register it in the routes of the plugin or API, or from a register function.'
    );
  });

  test('warns about the routes of a router replaced after initRouting', () => {
    const app = createAppWithRoutes();

    app.server.initRouting();
    (app.apis.article.routes as any).article = {
      type: 'content-api',
      routes: [route('/replaced')],
    };
    warnAboutRoutesAddedAfterRouting(app as any);

    expect(app.log.warn).toHaveBeenCalledTimes(1);
    expect(app.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Route "GET /replaced" of api::article (router "article")')
    );
  });

  test('does not warn outside development', () => {
    const app = createAppWithRoutes('production');

    app.server.initRouting();
    pushLateRoutes(app);
    warnAboutRoutesAddedAfterRouting(app as any);

    expect(app.log.warn).not.toHaveBeenCalled();
  });
});
