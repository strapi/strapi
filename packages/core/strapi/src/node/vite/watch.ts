import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs/promises';
import type { Core } from '@strapi/types';

import { mergeConfigWithUserConfig, resolveDevelopmentConfig } from './config';

import type { BuildContext } from '../create-build-context';

interface ViteWatcher {
  close(): Promise<void>;
}

const HMR_DEFAULT_PORT = 5173;

const createHMRServer = () => {
  return http.createServer(
    // http server request handler. keeps the same with
    // https://github.com/websockets/ws/blob/45e17acea791d865df6b255a55182e9c42e5877a/lib/websocket-server.js#L88-L96
    (_, res) => {
      const body = http.STATUS_CODES[426]; // Upgrade Required

      res.writeHead(426, {
        'Content-Length': body?.length ?? 0,
        'Content-Type': 'text/plain',
      });

      res.end(body);
    }
  );
};

const watch = async (ctx: BuildContext): Promise<ViteWatcher> => {
  const hmrServer = createHMRServer();

  ctx.options.hmrServer = hmrServer;
  ctx.options.hmrClientPort = HMR_DEFAULT_PORT;

  const config = await resolveDevelopmentConfig(ctx);
  const finalConfig = await mergeConfigWithUserConfig(config, ctx);

  const hmrConfig = config.server?.hmr;

  // If the server used for Vite hmr is the one we've created (<> no user override)
  if (typeof hmrConfig === 'object' && hmrConfig.server === hmrServer) {
    // Only restart the hmr server when Strapi's server is listening
    strapi.server.httpServer.on('listening', async () => {
      hmrServer.listen(hmrConfig.clientPort ?? hmrConfig.port ?? HMR_DEFAULT_PORT);
    });
  }

  ctx.logger.debug('Vite config', finalConfig);

  const { createServer } = await import('vite');

  const vite = await createServer(finalConfig);

  ctx.strapi.server.app.use((ctx, next) => {
    return new Promise((resolve, reject) => {
      vite.middlewares(ctx.req, ctx.res, (err: unknown) => {
        if (err) {
          reject(err);
        } else {
          resolve(next());
        }
      });
    });
  });

  const serveAdmin: Core.MiddlewareHandler = async (koaCtx, next) => {
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

      if (hmrServer.listening) {
        // Manually close the hmr server
        // /!\ This operation MUST be done after calling .close() on the vite
        //      instance to avoid flaky behaviors with attached clients
        await new Promise<void>((resolve, reject) => {
          hmrServer.close((err) => (err ? reject(err) : resolve()));
        });
      }
    },
  };
};

export { watch };
export type { ViteWatcher };
