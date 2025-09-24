'use strict';

const responseHandlers = require('./src/response-handlers');

module.exports = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:', 'strapi.dev.tipsoption.com'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:', 'https:'],
          'frame-src': ["'self'", 'strapi.dev.tipsoption.com'],
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: [
        'http://localhost:1337',
        'https://strapi.dev.tipsoption.com',
        'https://*.tipsoption.com',
        process.env.PUBLIC_URL || 'https://strapi.dev.tipsoption.com'
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
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
