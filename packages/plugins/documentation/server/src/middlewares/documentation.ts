import path from 'path';
import koaStatic from 'koa-static';
// The package entry evaluates swagger-ui-bundle.js. Jest's source-map-support
// then keeps a parsed copy of that source map on Error.prepareStackTrace for
// every API test file, so load only the filesystem helper.
// The '.js' suffix is required by the ESM build. swagger-ui-dist has no
// exports map, so Node cannot resolve the extensionless specifier from
// dist/server/index.mjs.
// eslint-disable-next-line import/extensions
import getAbsoluteFSPath from 'swagger-ui-dist/absolute-path.js';

import type { Core } from '@strapi/types';

export const addDocumentMiddlewares = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.server.routes([
    {
      method: 'GET',
      path: '/plugins/documentation/(.*)',
      async handler(ctx, next) {
        ctx.url = path.basename(ctx.url);

        return koaStatic(getAbsoluteFSPath(), {
          maxage: 86400000,
          defer: true,
        })(ctx, next);
      },
      config: {
        auth: false,
      },
    },
  ]);
};
