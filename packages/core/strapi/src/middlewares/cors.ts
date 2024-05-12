import koaCors from '@koa/cors';

import type { Common } from '@strapi/types';

export type Config = {
  enabled?: boolean;
  origin: string | string[] | ((ctx: any) => string | string[]);
  expose?: string | string[];
  maxAge?: number;
  credentials?: boolean;
  methods?: string | string[];
  headers?: string | string[];
  keepHeadersOnError?: boolean;
};

const defaults: Config = {
  origin: '*',
  maxAge: 31536000,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  keepHeadersOnError: false,
};

export const cors: Common.MiddlewareFactory<Config> = (config) => {
  const { origin, expose, maxAge, credentials, methods, headers, keepHeadersOnError } = {
    ...defaults,
    ...config,
  };

  if (config.enabled !== undefined) {
    strapi.log.warn(
      'The strapi::cors middleware no longer supports the `enabled` option. Using it' +
        ' to conditionally enable CORS might cause an insecure default. To disable strapi::cors, remove it from' +
        ' the exported array in config/middleware.js'
    );
  }

  return koaCors({
    async origin(ctx) {
      if (!ctx.get('Origin')) {
        return '*';
      }

      let originList: string | string[];

      if (typeof origin === 'function') {
        originList = await origin(ctx);
      } else {
        originList = origin;
      }

      if (Array.isArray(originList)) {
        return originList.includes(ctx.get('Origin')) ? ctx.get('Origin') : false;
      }

      return originList;
    },
    exposeHeaders: expose,
    maxAge,
    credentials,
    allowMethods: methods,
    allowHeaders: headers,
    keepHeadersOnError,
  });
};
