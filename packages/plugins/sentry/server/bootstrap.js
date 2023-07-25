'use strict';

const initSentryMiddleware = require('./middlewares/sentry');
const initSentryPerformanceMiddleware = require('./middlewares/sentry-performance');

module.exports = async ({ strapi }) => {
  // Initialize the Sentry service exposed by this plugin
  initSentryMiddleware({ strapi });
  initSentryPerformanceMiddleware({ strapi });
};
