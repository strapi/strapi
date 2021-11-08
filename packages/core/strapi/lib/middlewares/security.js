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
module.exports = config => (ctx, next) => {
  let helmetConfig = defaultsDeep(defaults, config);

  if (ctx.method === 'GET' && ['/graphql', '/documentation'].includes(ctx.path)) {
    helmetConfig = merge(helmetConfig, {
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          'img-src': ["'self'", 'data:', 'cdn.jsdelivr.net'],
        },
      },
    });
  }

  return helmet(helmetConfig)(ctx, next);
};
