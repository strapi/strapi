import { defaultsDeep, merge } from 'lodash/fp';
import helmet, { KoaHelmet } from 'koa-helmet';

import type { Common } from '@strapi/types';

export type Config = NonNullable<Parameters<KoaHelmet>[0]>;

const defaults: Config = {
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'connect-src': ["'self'", 'https:'],
      'img-src': ["'self'", 'data:', 'blob:', 'https://market-assets.strapi.io'],
      'media-src': ["'self'", 'data:', 'blob:'],
      upgradeInsecureRequests: null,
    },
  },
  xssFilter: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  frameguard: {
    action: 'sameorigin',
  },
};

export const security: Common.MiddlewareFactory<Config> =
  (config, { strapi }) =>
  (ctx, next) => {
    let helmetConfig: Config = defaultsDeep(defaults, config);

    const specialPaths = ['/documentation'];

    if (strapi.plugin('graphql')) {
      const { config: gqlConfig } = strapi.plugin('graphql');
      specialPaths.push(gqlConfig('endpoint'));
    }

    if (ctx.method === 'GET' && specialPaths.some((str) => ctx.path.startsWith(str))) {
      helmetConfig = merge(helmetConfig, {
        contentSecurityPolicy: {
          directives: {
            'script-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
            'img-src': ["'self'", 'data:', 'cdn.jsdelivr.net', 'strapi.io'],
          },
        },
      });
    }

    if (ctx.method === 'GET' && ['/admin'].some((str) => ctx.path.startsWith(str))) {
      helmetConfig = merge(helmetConfig, {
        contentSecurityPolicy: {
          directives: {
            'script-src': ["'self'", "'unsafe-inline'"],
            'connect-src': ["'self'", 'https:', 'ws:'],
          },
        },
      });
    }

    return helmet(helmetConfig)(ctx, next);
  };
