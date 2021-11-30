'use strict';

const initSentryMiddleware = require('./middlewares/sentry');

module.exports = async ({ strapi }) => {
  // Initialize the Sentry service exposed by this plugin
  initSentryMiddleware({ strapi });
};
