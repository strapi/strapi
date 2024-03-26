import path from 'node:path';
import fs from 'node:fs/promises';
import type { Common } from '@strapi/types';

import { mergeConfigWithUserConfig, resolveDevelopmentConfig } from './config';

import type { BuildContext } from '../createBuildContext';

interface ViteWatcher {
  close(): Promise<void>;
}

const watch = async (ctx: BuildContext): Promise<ViteWatcher> => {
  const config = await resolveDevelopmentConfig(ctx);
  const finalConfig = await mergeConfigWithUserConfig(config, ctx);

  ctx.logger.debug('Vite config', finalConfig);

  const { createServer } = await import('vite');

  const vite = await createServer(config);

  ctx.strapi.server.app.use(async (ctx, next) => {
    const url = ctx.url;

    // Check if the URL points to a file that Vite can handle
    const file = await vite.moduleGraph.getModuleByUrl(url);

    if (file || url.startsWith('/@')) {
      // If Vite can handle the file, pass the request to the Vite middleware
      return new Promise((resolve, reject) => {
        vite.middlewares(ctx.req, ctx.res, (err: unknown) => {
          if (err) reject(err);
          else resolve(next());
        });
      });
    }

    await next();
  });

  const serveAdmin: Common.MiddlewareHandler = async (koaCtx, next) => {
    await next();

    if (koaCtx.method !== 'HEAD' && koaCtx.method !== 'GET') {
      return;
    }

    if (koaCtx.body != null || koaCtx.status !== 404) {
      return;
    }

    const url = koaCtx.originalUrl;

    let template = await fs.readFile(path.relative(ctx.cwd, '.strapi/client/index.html'), 'utf-8');
    template = await vite.transformIndexHtml(url, template);

    koaCtx.type = 'html';
    koaCtx.body = template;
  };

  ctx.strapi.server.routes([
    {
      method: 'GET',
      path: `${ctx.basePath}:path*`,
      handler: serveAdmin,
      config: { auth: false },
    },
  ]);

  return {
    async close() {
      await vite.close();
    },
  };
};

export { watch };
export type { ViteWatcher };
