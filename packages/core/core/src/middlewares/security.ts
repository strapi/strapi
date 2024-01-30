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

    const directives: {
      'script-src': string[];
      'img-src': string[];
      'manifest-src': string[];
      'frame-src': string[];
    } = {
      'script-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      'img-src': ["'self'", 'data:', 'cdn.jsdelivr.net', 'strapi.io'],
      'manifest-src': [],
      'frame-src': [],
    };

    // if apollo graphql playground is enabled, add exceptions for it
    if (strapi.plugin('graphql')?.service('utils').playground.isEnabled()) {
      const { config: gqlConfig } = strapi.plugin('graphql');
      specialPaths.push(gqlConfig('endpoint'));

      directives['script-src'].push(`https: 'unsafe-inline'`);
      directives['img-src'].push(`'apollo-server-landing-page.cdn.apollographql.com'`);
      directives['manifest-src'].push(`'self'`);
      directives['manifest-src'].push('apollo-server-landing-page.cdn.apollographql.com');
      directives['frame-src'].push(`'self'`);
      directives['frame-src'].push('sandbox.embed.apollographql.com');
    }

    // TODO: we shouldn't combine playground exceptions with documentation for all routes, we should first check the path and then return exceptions specific to that
    if (ctx.method === 'GET' && specialPaths.some((str) => ctx.path.startsWith(str))) {
      helmetConfig = merge(helmetConfig, {
        crossOriginEmbedderPolicy: false, // TODO: only use this for graphql playground
        contentSecurityPolicy: {
          directives,
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
