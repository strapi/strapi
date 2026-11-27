import os from 'os';
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as z from 'zod/v4';

import createContentAPI from '..';
import { createServer } from '../../server';

type TestApp = {
  apis: Record<string, { routes: any }>;
  contentAPI: ReturnType<typeof createContentAPI>;
  server: ReturnType<typeof createServer>;
  log: { warn: ReturnType<typeof vi.fn>; error: () => void };
};

const apps: TestApp[] = [];

/**
 * A Strapi app with one API route, reduced to what route registration reads. Its routes go through
 * the real `server.initRouting()`, which merges the extra params into them.
 */
const createApp = (environment = 'development'): TestApp => {
  const apis = {
    article: {
      routes: {
        article: {
          type: 'content-api',
          routes: [{ method: 'GET', path: '/articles', handler: () => undefined }],
        },
      },
    },
  };

  const app: any = {
    config: {
      get(key: string, defaultValue?: unknown) {
        return key === 'environment' ? environment : defaultValue;
      },
    },
    get: (name: string) => (name === 'policies' ? { resolve: () => [] } : undefined),
    log: { warn: vi.fn(), error: () => undefined },
    dirs: { app: { root: os.tmpdir() } },
    admin: { routes: {} },
    plugins: {},
    apis,
    api: (name: string) => apis[name as keyof typeof apis],
  };

  app.contentAPI = createContentAPI(app);
  app.server = createServer(app);
  apps.push(app);

  return app;
};

const articleRoute = (app: TestApp) => app.apis.article.routes.article.routes[0];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.server.destroy()));
});

describe('contentAPI.addQueryParams and addInputParams after the routes are registered', () => {
  test('merges params added before initRouting into the routes, without a warning', () => {
    const app = createApp();

    app.contentAPI.addQueryParams({ search: { schema: z.string().optional() } });
    app.contentAPI.addInputParams({ clientMutationId: { schema: z.string().optional() } });
    app.server.initRouting();

    const route = articleRoute(app);
    expect(Object.keys(route.request.query)).toEqual(['search']);
    expect(Object.keys(route.request.body['application/json'].shape)).toEqual(['clientMutationId']);
    expect(app.log.warn).not.toHaveBeenCalled();
  });

  test('warns once per query param added after initRouting: no route gets it', () => {
    const app = createApp();

    app.server.initRouting();
    app.contentAPI.addQueryParams({ search: { schema: z.string().optional() } });
    app.contentAPI.addQueryParams({ other: { schema: z.string().optional() } });

    expect(articleRoute(app).request).toBeUndefined();
    expect(app.log.warn).toHaveBeenCalledTimes(2);
    expect(app.log.warn).toHaveBeenNthCalledWith(
      1,
      '[strapi] Query param "search" (contentAPI.addQueryParams) was registered after Strapi registered the routes (server.initRouting(), in the bootstrap phase, before the bootstrap functions of plugins and APIs): Strapi adds it to no route, so requests treat it as an unknown key (with api.rest.strictParams, a 400 "Invalid key"). Register it from a register function.'
    );
  });

  test('warns once per input param added after initRouting: no route gets it', () => {
    const app = createApp();

    app.server.initRouting();
    app.contentAPI.addInputParams({ clientMutationId: { schema: z.string().optional() } });

    expect(articleRoute(app).request).toBeUndefined();
    expect(app.log.warn).toHaveBeenCalledTimes(1);
    expect(app.log.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '[strapi] Input param "clientMutationId" (contentAPI.addInputParams) was registered after Strapi registered the routes'
      )
    );
    expect(app.log.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        ': Strapi adds it to no route, so requests that send it get a 400 "Invalid key". Register it from a register function.'
      )
    );
  });

  test('does not warn twice for the same late param in the same app', () => {
    const app = createApp();

    app.server.initRouting();
    app.contentAPI.addQueryParams({ search: { schema: z.string().optional() } });
    // Rejected as a duplicate, as before: the warning is not repeated
    expect(() =>
      app.contentAPI.addQueryParams({ search: { schema: z.string().optional() } })
    ).toThrow('contentAPI.addQueryParams: param "search" has already been added');

    expect(app.log.warn).toHaveBeenCalledTimes(1);
  });

  test('does not warn about a late param that is rejected', () => {
    const app = createApp();

    app.server.initRouting();
    expect(() =>
      app.contentAPI.addQueryParams({ filters: { schema: z.string().optional() } })
    ).toThrow('is reserved by Strapi');

    expect(app.log.warn).not.toHaveBeenCalled();
  });

  test.each(['production', 'test'])('does not warn when the environment is %s', (environment) => {
    const app = createApp(environment);

    app.server.initRouting();
    app.contentAPI.addQueryParams({ search: { schema: z.string().optional() } });
    app.contentAPI.addInputParams({ clientMutationId: { schema: z.string().optional() } });

    expect(app.log.warn).not.toHaveBeenCalled();
  });
});
