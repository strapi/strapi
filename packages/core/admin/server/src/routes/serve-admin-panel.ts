import type { Context, Next } from 'koa';
import { resolve, join, extname, basename } from 'path';
import fse from 'fs-extra';
import koaStatic from 'koa-static';
import type { Core } from '@strapi/types';

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
          maxage: 31536000,
          defer: false,
          index: 'index.html',
          setHeaders(res: any, path: any) {
            const ext = extname(path);
            // publicly cache static files to avoid unnecessary network & disk access
            if (ext !== '.html') {
              res.setHeader('cache-control', 'public, max-age=31536000, immutable');
            }
          },
        }),
      ],
      config: { auth: false },
    },
  ]);
};

// serveStatic is not supposed to be used to serve a folder that have sub-folders
const serveStatic = (filesDir: any, koaStaticOptions = {}) => {
  const serve = koaStatic(filesDir, koaStaticOptions);

  return async (ctx: Context, next: Next) => {
    const prev = ctx.path;
    const newPath = basename(ctx.path);

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
