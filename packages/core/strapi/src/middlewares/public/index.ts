import fs from 'fs';
import path from 'path';
import stream from 'stream';
import _ from 'lodash';
import { defaultsDeep } from 'lodash/fp';
import koaStatic from 'koa-static';
import type { Strapi, Common } from '@strapi/types';
import * as utils from '../../utils';
import { serveStatic } from './serve-static';

type Config = koaStatic.Options;

const defaults = {
  maxAge: 60000,
  defaultIndex: true,
};

export const publicStatic: Common.MiddlewareFactory = (
  config: Config,
  { strapi }: { strapi: Strapi }
) => {
  const { defaultIndex, maxAge } = defaultsDeep(defaults, config);

  if (defaultIndex === true) {
    const index = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

    const redirectToAdmin: Common.MiddlewareHandler = async (ctx) => {
      ctx.redirect(strapi.config.admin.url);
    };

    strapi.server.routes([
      {
        method: 'GET',
        path: '/',
        handler: redirectToAdmin,
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/index.html',
        handler: redirectToAdmin,
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/assets/images/(.*)',
        handler: serveStatic(path.resolve(__dirname, 'assets/images'), {
          maxage: maxAge,
          defer: true,
        }),
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
  }
};
