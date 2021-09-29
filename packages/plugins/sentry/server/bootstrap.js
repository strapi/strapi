'use strict';

module.exports = async ({ strapi }) => {
  // Initialize the Sentry service exposed by this plugin
  strapi
    .plugin('sentry')
    .service('sentry')
    .init();
};
