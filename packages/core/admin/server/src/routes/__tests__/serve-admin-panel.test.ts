import type { Context, Next } from 'koa';
import fse from 'fs-extra';
import type { Core } from '@strapi/types';

import registerAdminPanelRoute, { serveStatic } from '../serve-admin-panel';

type AdminPanelRoute = {
  method: string;
  path: string;
  handler: Array<(ctx: Context, next: Next) => Promise<void> | void>;
  config: { auth: boolean };
};

jest.mock('koa-static', () => {
  return jest.fn(() => jest.fn());
});

jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  pathExistsSync: jest.fn(() => true),
  createReadStream: jest.fn(() => 'index-html-stream'),
}));

const koaStatic = jest.requireMock('koa-static');

describe('serveAdminPanel route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('admin shell cache headers', () => {
    const createStrapi = () => {
      let registeredRoutes: AdminPanelRoute[] = [];
      const strapi = {
        dirs: { dist: { root: '/tmp/strapi-dist' } },
        config: { admin: { path: '/admin' } },
        server: {
          routes(routes: AdminPanelRoute[]) {
            registeredRoutes = routes;
          },
        },
      };
      return { strapi, getRoutes: () => registeredRoutes };
    };

    test('SPA fallback revalidates the HTML shell', async () => {
      const { strapi, getRoutes } = createStrapi();
      registerAdminPanelRoute({ strapi: strapi as unknown as Core.Strapi });

      const [spaFallback] = getRoutes()[0].handler;
      const headers: Record<string, string> = {};
      const ctx = {
        method: 'GET',
        body: null,
        status: 404,
        type: undefined as string | undefined,
        set(key: string, value: string) {
          headers[key.toLowerCase()] = value;
        },
      };
      const next = jest.fn(async () => undefined);

      await spaFallback(ctx as unknown as Context, next);

      expect(fse.createReadStream).toHaveBeenCalled();
      expect(headers['cache-control']).toBe('no-cache');
      expect(headers['surrogate-control']).toBe('no-store');
    });

    test('static HTML responses revalidate; hashed assets stay immutable', () => {
      const { strapi } = createStrapi();
      registerAdminPanelRoute({ strapi: strapi as unknown as Core.Strapi });

      expect(koaStatic).toHaveBeenCalled();
      const options = koaStatic.mock.calls[0][1];
      expect(options.maxage).toBe(0);

      const htmlHeaders: Record<string, string> = {};
      options.setHeaders(
        {
          setHeader(key: string, value: string) {
            htmlHeaders[key.toLowerCase()] = value;
          },
        },
        '/tmp/build/index.html'
      );
      expect(htmlHeaders['cache-control']).toBe('no-cache');
      expect(htmlHeaders['surrogate-control']).toBe('no-store');

      const assetHeaders: Record<string, string> = {};
      options.setHeaders(
        {
          setHeader(key: string, value: string) {
            assetHeaders[key.toLowerCase()] = value;
          },
        },
        '/tmp/build/layout-abc123.js'
      );
      expect(assetHeaders['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(assetHeaders['surrogate-control']).toBeUndefined();
    });
  });

  describe('serveStatic', () => {
    test('skips extensionless paths so admin API routes are not served as static files', async () => {
      const staticMiddleware = jest.fn();
      koaStatic.mockReturnValue(staticMiddleware);

      const middleware = serveStatic('/tmp/build');
      const ctx = { path: '/admin/init' };
      const next = jest.fn();

      await middleware(ctx as unknown as Context, next);

      expect(staticMiddleware).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.path).toBe('/admin/init');
    });

    test('serves static assets from the basename of the admin path', async () => {
      let staticPath: string | undefined;
      const staticMiddleware = jest.fn(async (_ctx, next) => {
        staticPath = _ctx.path;
        await next();
      });
      koaStatic.mockReturnValue(staticMiddleware);

      const middleware = serveStatic('/tmp/build');
      const ctx = { path: '/admin/assets/index.js' };
      const next = jest.fn();

      await middleware(ctx as unknown as Context, next);

      expect(staticMiddleware).toHaveBeenCalledTimes(1);
      expect(staticPath).toBe('/index.js');
      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.path).toBe('/admin/assets/index.js');
    });

    test('keeps rewritten dotted content-manager paths URL-safe', async () => {
      let staticPath: string | undefined;
      const staticMiddleware = jest.fn(async (_ctx, next) => {
        staticPath = _ctx.path;
        await next();
      });
      koaStatic.mockReturnValue(staticMiddleware);

      const middleware = serveStatic('/tmp/build');
      const ctx = { path: '/admin/content-manager/collection-types/api::article.article' };
      const next = jest.fn();

      await middleware(ctx as unknown as Context, next);

      expect(staticMiddleware).toHaveBeenCalledTimes(1);
      expect(staticPath).toBe('/api::article.article');
      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.path).toBe('/admin/content-manager/collection-types/api::article.article');
    });
  });
});
