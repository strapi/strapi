import path from 'node:path';
import fs from 'node:fs/promises';
import type { Core } from '@strapi/types';

import { mergeConfigWithUserConfig, resolveDevelopmentConfig } from './config';

import type { BuildContext } from '../create-build-context';

interface ViteWatcher {
  close(): Promise<void>;
}

const watch = async (ctx: BuildContext): Promise<ViteWatcher> => {
  const finalConfig = await mergeConfigWithUserConfig(await resolveDevelopmentConfig(ctx), ctx);

  ctx.logger.debug('Vite config', finalConfig);

  // Imported dynamically so this file's CJS build resolves Vite's ESM Node API instead of
  // its CJS entry, which emits "The CJS build of Vite's Node API is deprecated".
  // https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated
  const { createServer } = await import('vite');

  const vite = await createServer(finalConfig);

  const viteMiddlewares: Core.MiddlewareHandler = (koaCtx, next) => {
    return new Promise((resolve, reject) => {
      const prefix = ctx.basePath.replace(ctx.adminPath, '').replace(/\/+$/, '');

      const originalPath = koaCtx.path;
      if (!koaCtx.path.startsWith(prefix)) {
        koaCtx.path = `${prefix}${koaCtx.path}`;
      }

      // Set cache-control headers to prevent caching issues during development restarts
      koaCtx.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      koaCtx.set('Pragma', 'no-cache');
      koaCtx.set('Expires', '0');
      koaCtx.set('Surrogate-Control', 'no-store');

      vite.middlewares(koaCtx.req, koaCtx.res, (err: unknown) => {
        if (err) {
          reject(err);
        } else {
          if (!koaCtx.res.headersSent) {
            koaCtx.path = originalPath;
          }

          resolve(next());
        }
      });
    });
  };

  const serveAdmin: Core.MiddlewareHandler = async (koaCtx, next) => {
    await next();

    if (koaCtx.method !== 'HEAD' && koaCtx.method !== 'GET') {
      return;
    }

    if (koaCtx.body != null || koaCtx.status !== 404) {
      return;
    }

    const url = koaCtx.originalUrl;

    try {
      let template = await fs.readFile(
        path.relative(ctx.cwd, '.strapi/client/index.html'),
        'utf-8'
      );
      template = await vite.transformIndexHtml(url, template);

      koaCtx.type = 'html';
      koaCtx.body = template;
    } catch (error) {
      ctx.logger.error('Failed to serve admin panel in development mode:', error);
      // Don't fallback to other handlers in development mode to prevent MIME type conflicts
      koaCtx.status = 500;
      koaCtx.body = 'Admin panel temporarily unavailable during server restart';
    }
  };

  const adminRoute = `${ctx.adminPath}/:path*`;

  // Remove any existing admin routes to prevent conflicts during restart
  const existingRoutes = ctx.strapi.server.router.stack.filter(
    (layer) => layer.path === adminRoute
  );
  existingRoutes.forEach((route) => {
    const index = ctx.strapi.server.router.stack.indexOf(route);
    if (index > -1) {
      ctx.strapi.server.router.stack.splice(index, 1);
    }
  });

  ctx.strapi.server.router.get(adminRoute, serveAdmin);
  ctx.strapi.server.router.use(adminRoute, viteMiddlewares);

  return {
    async close() {
      await vite.close();
    },
  };
};

export { watch };
export type { ViteWatcher };
