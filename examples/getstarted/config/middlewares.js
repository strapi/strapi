'use strict';

const responseHandlers = require('./src/response-handlers');

module.exports = [
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  // 'strapi::compression',
  // 'strapi::ip',
  {
    name: 'strapi::responses',
    config: {
      handlers: responseHandlers,
    },
  },
  'strapi::favicon',
  'strapi::public',
  {
    name: 'global::test-middleware',
    config: {
      foo: 'bar',
    },
  },
  {
    resolve: './src/custom/middleware.js',
    config: {},
  },
];
