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

    const specialPaths = ['/documentation'];

    const directives: {
      // TODO: figure out why some must be snake-case and some must be camelCase and standardize them
      'script-src': string[];
      'img-src': string[];
      manifestSrc: string[];
      frameSrc: string[];
    } = {
      'script-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      'img-src': ["'self'", 'data:', 'cdn.jsdelivr.net', 'strapi.io'],
      manifestSrc: [],
      frameSrc: [],
    };

    if (strapi.plugin('graphql')) {
      const { config: gqlConfig } = strapi.plugin('graphql');
      specialPaths.push(gqlConfig('endpoint'));

      // if playground is enabled, add exceptions for apollo
      if (strapi.plugin('graphql').isPlaygroundEnabled()) {
        directives['script-src'].push(`https: 'unsafe-inline'`);
        directives['img-src'].push(`'apollo-server-landing-page.cdn.apollographql.com'`);
        directives.manifestSrc.push(`'self'`);
        directives.manifestSrc.push('apollo-server-landing-page.cdn.apollographql.com');
        directives.frameSrc.push(`'self'`);
        directives.frameSrc.push('sandbox.embed.apollographql.com');
      }
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

    return helmet(helmetConfig)(ctx, next);
  };
