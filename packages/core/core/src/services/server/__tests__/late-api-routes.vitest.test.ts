import os from 'os';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createServer } from '..';

type TestApp = {
  server: ReturnType<typeof createServer>;
  log: { warn: ReturnType<typeof vi.fn>; error: () => void };
};

const route = (path: string) => ({ method: 'GET' as const, path, handler: () => undefined });

const apps: TestApp[] = [];

/** A Strapi app reduced to what the server and its route manager read. */
const createApp = (environment = 'development'): TestApp => {
  const config: Record<string, unknown> = { environment, 'api.rest.prefix': '/api' };
  const app: any = {
    config: {
      get: (key: string, defaultValue?: unknown) => config[key] ?? defaultValue,
    },
    get: (name: string) => (name === 'policies' ? { resolve: () => [] } : undefined),
    log: { warn: vi.fn(), error: () => undefined },
    dirs: { app: { root: os.tmpdir() } },
  };

  app.server = createServer(app);
  apps.push(app);

  return app;
};

const contentAPIRouter = (path: string, prefix?: string) => ({
  type: 'content-api',
  ...(prefix === undefined ? {} : { prefix }),
  routes: [route(path)],
});

const contentAPIPaths = (app: TestApp) =>
  app.server
    .api('content-api')
    .listRoutes()
    .map((layer) => layer.path);

const mountedPaths = (app: TestApp) => app.server.listRoutes().map((layer) => layer.path);

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.server.destroy()));
});

describe('routes added to a server API after mount', () => {
  test('keeps routes added before mount served and silent', () => {
    const app = createApp();

    app.server.routes(contentAPIRouter('/before', '/foo'));
    app.server.api('content-api').routes([route('/direct')]);
    app.server.mount();

    expect(app.log.warn).not.toHaveBeenCalled();
    expect(mountedPaths(app)).toEqual(expect.arrayContaining(['/api/foo/before', '/api/direct']));
  });

  test('warns once per route added to a server API after mount, and keeps the route unserved', () => {
    const app = createApp();

    app.server.mount();
    app.server.routes(contentAPIRouter('/late', '/foo'));
    app.server.routes(contentAPIRouter('/late', '/foo'));

    expect(app.log.warn).toHaveBeenCalledTimes(1);
    expect(app.log.warn).toHaveBeenCalledWith(
      '[strapi] Route "GET /api/foo/late" of the content-api API was registered after the server mounted the API routers (server.mount(), when the server starts listening): Strapi does not serve it. Register it before the server starts listening, for example from a register or bootstrap function.'
    );
    // Same behaviour as before the warning: the API router holds the route, the mounted router does not
    expect(contentAPIPaths(app)).toContain('/api/foo/late');
    expect(mountedPaths(app)).not.toContain('/api/foo/late');
  });

  test('warns about routes added through server.api(type).routes() after mount', () => {
    const app = createApp();

    app.server.mount();
    app.server.api('content-api').routes([route('/direct-late')]);

    expect(app.log.warn).toHaveBeenCalledTimes(1);
    expect(app.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Route "GET /api/direct-late" of the content-api API was registered')
    );
  });

  test('does not warn about routes added to the root router after mount: they are served', () => {
    const app = createApp();

    app.server.mount();
    app.server.routes([route('/root-late')]);

    expect(app.log.warn).not.toHaveBeenCalled();
    expect(mountedPaths(app)).toContain('/root-late');
  });

  test('does not warn outside development', () => {
    const app = createApp('production');

    app.server.mount();
    app.server.routes(contentAPIRouter('/late'));

    expect(app.log.warn).not.toHaveBeenCalled();
  });
});
