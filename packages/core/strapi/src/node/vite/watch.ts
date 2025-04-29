import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs/promises';
import { Server } from 'node:net';
import type { Core } from '@strapi/types';

import { mergeConfigWithUserConfig, resolveDevelopmentConfig } from './config';

import type { BuildContext } from '../create-build-context';

interface ViteWatcher {
  close(): Promise<void>;
}

const HMR_DEFAULT_PORT = 5173;
const MAX_PORT_ATTEMPTS = 30;

const findAvailablePort = (
  startingPort: number,
  attemptsLeft = MAX_PORT_ATTEMPTS
): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (attemptsLeft <= 0) {
      reject(new Error(`No available ports found after ${MAX_PORT_ATTEMPTS} attempts.`));
      return;
    }

    const server = new Server();
    server.listen(startingPort, () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startingPort + 1, attemptsLeft - 1));
      } else {
        reject(err);
      }
    });
  });
};

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

  // Allowing Vite to find an available port doesn't work, so we'll find an available port manually
  // and use that. There is therefore a very slight race condition if you start up two servers at the same time
  // one might fail, or it might start up but listen on the wrong port.
  const availablePort = await findAvailablePort(HMR_DEFAULT_PORT);
  ctx.options.hmrServer = hmrServer;
  ctx.options.hmrClientPort = availablePort;

  const config = await resolveDevelopmentConfig(ctx);

  const finalConfig = await mergeConfigWithUserConfig(config, ctx);

  const hmrConfig = config.server?.hmr;

  // If the server used for Vite hmr is the one we've created (<> no user override)
  if (typeof hmrConfig === 'object' && hmrConfig.server === hmrServer) {
    // Only restart the hmr server when Strapi's server is listening
    strapi.server.httpServer.on('listening', async () => {
      hmrServer.listen(availablePort);
    });
  }

  ctx.logger.debug('Vite config', finalConfig);

  const { createServer } = await import('vite');

  const vite = await createServer(finalConfig);

  const viteMiddlewares: Core.MiddlewareHandler = (koaCtx, next) => {
    return new Promise((resolve, reject) => {
      const prefix = ctx.basePath.replace(ctx.adminPath, '').replace(/\/+$/, '');

      const originalPath = koaCtx.path;
      if (!koaCtx.path.startsWith(prefix)) {
        koaCtx.path = `${prefix}${koaCtx.path}`;
      }

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

    let template = await fs.readFile(path.relative(ctx.cwd, '.strapi/client/index.html'), 'utf-8');
    template = await vite.transformIndexHtml(url, template);

    koaCtx.type = 'html';
    koaCtx.body = template;
  };

  const adminRoute = `${ctx.adminPath}/:path*`;

  ctx.strapi.server.router.get(adminRoute, serveAdmin);
  ctx.strapi.server.router.use(adminRoute, viteMiddlewares);

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
