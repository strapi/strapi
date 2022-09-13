'use strict';

/**
 * `test-middleware` middleware
 */

module.exports = (config, { strapi }) => {
  // Add your own logic here.
  return async (ctx, next) => {
    strapi.log.info('In application test-middleware middleware.');

    await next();
  };
};
