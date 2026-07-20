import type { ServerResponse } from 'http';
import type { Context, Next } from 'koa';
import { resolve, join, extname, basename } from 'path';
import fse from 'fs-extra';
import koaStatic from 'koa-static';
import type { Core } from '@strapi/types';

const ADMIN_SHELL_CACHE_CONTROL = 'no-cache';
const ADMIN_SHELL_SURROGATE_CONTROL = 'no-store';
const HASHED_ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const applyAdminShellCacheHeaders = (setHeader: (name: string, value: string) => void) => {
  setHeader('Cache-Control', ADMIN_SHELL_CACHE_CONTROL);
  setHeader('Surrogate-Control', ADMIN_SHELL_SURROGATE_CONTROL);
};

const registerAdminPanelRoute = ({ strapi }: { strapi: Core.Strapi }) => {
  let buildDir = resolve(strapi.dirs.dist.root, 'build');

  if (!fse.pathExistsSync(buildDir)) {
    buildDir = resolve(__dirname, '../../build');
  }

  const serveAdminMiddleware = async (ctx: Context, next: Next) => {
    await next();

    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') {
      return;
    }

    if (ctx.body != null || ctx.status !== 404) {
      return;
    }

    applyAdminShellCacheHeaders((name, value) => {
      ctx.set(name, value);
    });
    ctx.type = 'html';
    ctx.body = fse.createReadStream(join(buildDir, 'index.html'));
  };

  strapi.server.routes([
    {
      method: 'GET',
      path: `${strapi.config.admin.path}/:path*`,
      handler: [
        serveAdminMiddleware,
        serveStatic(buildDir, {
          maxage: 0,
          defer: false,
          index: 'index.html',
          setHeaders(res: ServerResponse, path: string) {
            const ext = extname(path);
            if (ext === '.html') {
              applyAdminShellCacheHeaders((name, value) => {
                res.setHeader(name, value);
              });
              return;
            }

            res.setHeader('Cache-Control', HASHED_ASSET_CACHE_CONTROL);
          },
        }),
      ],
      config: { auth: false },
    },
  ]);
};

// serveStatic is not supposed to be used to serve a folder that have sub-folders
export const serveStatic = (filesDir: any, koaStaticOptions = {}) => {
  const serve = koaStatic(filesDir, koaStaticOptions);

  return async (ctx: Context, next: Next) => {
    if (!extname(ctx.path)) {
      await next();
      return;
    }

    const prev = ctx.path;
    const newPath = `/${basename(ctx.path)}`;

    ctx.path = newPath;
    await serve(ctx, async () => {
      ctx.path = prev;
      await next();
      ctx.path = newPath;
    });
    ctx.path = prev;
  };
};

export default registerAdminPanelRoute;
