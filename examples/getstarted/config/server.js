'use strict';

/**
 * @typedef {import('@strapi/strapi').StrapiConfigContext} StrapiConfigContext
 * @typedef {import('@strapi/strapi').StrapiServerConfig} StrapiServerConfig
 */

const cronTasks = require('./src/cron-tasks');

/**
 * @param {StrapiConfigContext} ctx
 * @returns {StrapiServerConfig}
 */
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    autoOpen: false,
    auth: {
      secret: env('ADMIN_JWT_SECRET', 'example-token'),
    },
  },
  cron: {
    enabled: true,
    tasks: cronTasks,
  },
});
