'use strict';

const registerSentryMiddleware = require('./middlewares/sentry');

/**
 * Register sentry plugin
 * @param {{ strapi: import('@strapi/strapi').Strapi }}
 */
module.exports = ({ strapi }) => {
  registerSentryMiddleware({ strapi });
};
