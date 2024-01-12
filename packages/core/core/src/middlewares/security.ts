import { defaultsDeep, merge } from 'lodash/fp';
import helmet, { KoaHelmet } from 'koa-helmet';

import type { Common, Strapi } from '@strapi/types';
import type { Context, Next } from 'koa';

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
  (config: any, { strapi }: { strapi: Strapi }) =>
  (ctx: Context, next: Next) => {
    let helmetConfig: Config = defaultsDeep(defaults, config);

    const specialPaths: Record<string, Config> = {
      '/documentation': {
        contentSecurityPolicy: {
          directives: {
            'script-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
            'img-src': ["'self'", 'data:', 'cdn.jsdelivr.net', 'strapi.io'],
          },
        },
      },
    };

    if (strapi.plugin('graphql') && strapi.plugin('graphql').isPlaygroundEnabled()) {
      const { config: gqlConfig } = strapi.plugin('graphql');
      specialPaths[gqlConfig('endpoint') as string] = {
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
          directives: {
            'script-src': ["'self'", "'unsafe-inline'", `https: 'unsafe-inline'`],
            'img-src': [
              "'self'",
              'data:',
              `'apollo-server-landing-page.cdn.apollographql.com'`,
              'strapi.io',
            ],
            'manifest-src': [`'self'`, 'apollo-server-landing-page.cdn.apollographql.com'],
            'frame-src': [`'self'`, 'sandbox.embed.apollographql.com'],
          },
        },
      };
    }

    if (ctx.method === 'GET') {
      // if this path matches one of our special paths, merge in its config
      // Note that it only finds the first matching path, but there should never be a case where one path starts with another path
      const matchedPathKey = Object.keys(specialPaths).find((key) => ctx.path.startsWith(key));

      if (matchedPathKey) {
        helmetConfig = merge(helmetConfig, specialPaths[matchedPathKey]);
      }
    }

    return helmet(helmetConfig)(ctx, next);
  };
