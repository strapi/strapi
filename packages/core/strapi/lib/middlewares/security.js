'use strict';

const { defaultsDeep, merge } = require('lodash/fp');
const helmet = require('koa-helmet');

const defaults = {
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'connect-src': ["'self'", 'https:'],
      'img-src': ["'self'", 'data:', 'blob:', 'https://dl.airtable.com'],
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

/**
 * @type {import('./').MiddlewareFactory}
 */

module.exports =
  (config, { strapi }) =>
  (ctx, next) => {
    let helmetConfig = defaultsDeep(defaults, config);
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

    return helmet(helmetConfig)(ctx, next);
  };
