'use strict';

const { defaultsDeep } = require('lodash/fp');
const helmet = require('koa-helmet');

const defaults = {
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
  contentSecurityPolicy: false,
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
module.exports = options => helmet(defaultsDeep(defaults, options));
