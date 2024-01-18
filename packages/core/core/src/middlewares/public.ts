import { defaultsDeep } from 'lodash/fp';
import koaStatic from 'koa-static';
import type { Strapi, Common } from '@strapi/types';

type Config = koaStatic.Options;

const defaults = {
  maxAge: 60000,
};

export const publicStatic: Common.MiddlewareFactory = (
  config: Config,
  { strapi }: { strapi: Strapi }
) => {
  const { maxAge } = defaultsDeep(defaults, config);

  strapi.server.routes([
    {
      method: 'GET',
      path: '/',
      handler(ctx) {
        ctx.redirect('/admin');
      },
      config: { auth: false },
    },
    // All other public GET-routes except /uploads/(.*) which is handled in upload middleware
    {
      method: 'GET',
      path: '/((?!uploads/).+)',
      handler: koaStatic(strapi.dirs.static.public, {
        maxage: maxAge,
        defer: true,
      }),
      config: { auth: false },
    },
  ]);
};
