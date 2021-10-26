'use strict';

const { defaultsDeep } = require('lodash/fp');
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
module.exports = config => helmet(defaultsDeep(defaults, config));
