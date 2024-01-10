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

    const serveIndexPage: Common.MiddlewareHandler = async (ctx, next) => {
      // defer rendering of strapi index page
      await next();

      if (ctx.body != null || ctx.status !== 404) return;

      ctx.url = 'index.html';
      const isInitialized = await utils.isInitialized(strapi);
      const data = {
        serverTime: new Date().toUTCString(),
        isInitialized,
        ..._.pick(strapi, [
          'config.info.version',
          'config.info.name',
          'config.admin.url',
          'config.server.url',
          'config.environment',
          'config.serveAdminPanel',
        ]),
      };
      const content = _.template(index)(data);
      const body = new stream.Readable({
        read() {
          this.push(Buffer.from(content));
          this.push(null);
        },
      });

      // Serve static.
      ctx.type = 'html';
      ctx.body = body;
    };

    strapi.server.routes([
      {
        method: 'GET',
        path: '/',
        handler: serveIndexPage,
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/index.html',
        handler: serveIndexPage,
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
