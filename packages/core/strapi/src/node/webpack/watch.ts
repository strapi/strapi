import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import { webpack } from 'webpack';
import type { Core } from '@strapi/types';
import type { BuildContext } from '../create-build-context';
import { mergeConfigWithUserConfig, resolveDevelopmentConfig } from './config';

interface WebpackWatcher {
  close(): Promise<void>;
}

const watch = async (ctx: BuildContext): Promise<WebpackWatcher> => {
  const config = await resolveDevelopmentConfig(ctx);
  const finalConfig = await mergeConfigWithUserConfig(config, ctx);

  ctx.logger.debug('Final webpack config:', os.EOL, finalConfig);

  return new Promise<WebpackWatcher>((res) => {
    const compiler = webpack(finalConfig);

    // The wrapper exposes devMiddleware at runtime, but 8.5.0 omits it from its declarations.
    const koaMiddleware = webpackDevMiddleware.koaWrapper(compiler) as ReturnType<
      typeof webpackDevMiddleware.koaWrapper
    > & { devMiddleware: ReturnType<typeof webpackDevMiddleware> };
    const devMiddleware = koaMiddleware.devMiddleware;

    const hotMiddleware = webpackHotMiddleware(compiler, {
      log: false,
      path: '/__webpack_hmr',
    });

    ctx.strapi.server.app.use((ctx, next) => {
      return new Promise((resolve, reject) => {
        hotMiddleware(ctx.req, ctx.res, (err) => {
          if (err) reject(err);
          else resolve(next());
        });
      });
    });

    ctx.strapi.server.app.use(koaMiddleware);

    const serveAdmin: Core.MiddlewareHandler = async (ctx, next) => {
      await next();

      if (devMiddleware.context.outputFileSystem.createReadStream) {
        if (ctx.method !== 'HEAD' && ctx.method !== 'GET') {
          return;
        }

        if (ctx.body != null || ctx.status !== 404) {
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        const filename = path.resolve(finalConfig.output?.path!, 'index.html');
        ctx.type = 'html';
        ctx.body = devMiddleware.context.outputFileSystem.createReadStream(filename);
      }
    };

    ctx.strapi.server.routes([
      {
        method: 'GET',
        path: `${ctx.adminPath}/:path*`,
        handler: serveAdmin,
        config: { auth: false },
      },
    ]);

    devMiddleware.waitUntilValid(() => {
      res({
        async close() {
          await Promise.all([
            promisify(devMiddleware.close.bind(devMiddleware))(),
            hotMiddleware.close(),
            promisify(compiler.close.bind(compiler))(),
          ]);
        },
      });
    });
  });
};

export { watch };
export type { WebpackWatcher };
