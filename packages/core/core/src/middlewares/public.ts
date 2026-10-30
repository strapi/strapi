import { defaultsDeep } from 'lodash';
import koaStatic from 'koa-static';
import type { Core } from '@strapi/types';

type Config = koaStatic.Options;

const defaults = {
  maxAge: 60000,
};

export const publicStatic: Core.MiddlewareFactory = (
  config: Config,
  { strapi }: { strapi: Core.Strapi }
) => {
  const { maxAge } = defaultsDeep({}, config, defaults);

  const serveStatic = koaStatic(strapi.dirs.static.public, {
    maxage: maxAge,
    defer: true,
  });

  strapi.server.routes([
    {
      method: 'GET',
      path: '/',
      handler(ctx) {
        ctx.redirect(strapi.config.get('admin.url', '/admin'));
      },
      config: { auth: false },
    },
    // All other public GET-routes except /uploads/{*path} which is handled in upload middleware
    {
      method: 'GET',
      path: '/*path',
      handler(ctx, next) {
        if (ctx.path.startsWith('/uploads/')) {
          return next();
        }

        return serveStatic(ctx, next);
      },
      config: { auth: false },
    },
  ]);
};
