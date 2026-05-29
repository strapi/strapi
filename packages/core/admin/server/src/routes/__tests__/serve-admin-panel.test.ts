import type { Context } from 'koa';

import { serveStatic } from '../serve-admin-panel';

jest.mock('koa-static', () => {
  return jest.fn(() => jest.fn());
});

const koaStatic = jest.requireMock('koa-static');

describe('serveAdminPanel route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(staticPath).toBe('index.js');
      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.path).toBe('/admin/assets/index.js');
    });
  });
});
