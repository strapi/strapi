'use strict';

const cronTasks = require('./src/cron-tasks');

module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: 'http://localhost:1337',
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
});
