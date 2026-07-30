'use strict';

const cronTasks = require('./src/cron-tasks');

module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  cron: {
    enabled: true,
    tasks: cronTasks,
  },
  app: {
    keys: env.array('APP_KEYS', ['toBeModified1', 'toBeModified2']),
  },
  webhooks: {
    // TODO: V5, set to false by default
    // Receive populated relations in webhook and db lifecycle payloads
    // This only populates relations in all content-manager endpoints
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', true),
  },
  // ℹ️ http_proxy is the env var used by system to set proxy globally
  globalProxy: env('http_proxy'),
  http: {
    serverOptions: {
      requestTimeout: 1000 * 60 * 10, // set request timeout to 600000ms (10 minutes)
    },
  },
  transfer: {
    remote: {
      // enabled: false,
    },
  },
  logger: {
    config: {
      // getstarted uses 'silly'; keep the demo readable — core's schema-registry
      // and analytics debug logs drown out the interesting lines otherwise.
      level: env('LOG_LEVEL', 'info'),
    },
    updates: {
      // enabled: false,
    },
    startup: {
      // enabled: false,
    },
  },
});
