'use strict';

/**
 * `test-middleware` middleware.
 */

module.exports = (config, { strapi }) => {
  // Add your own logic here.
  return async (ctx, next) => {
    strapi.log.info('In test-middleware middleware.');

    await next();
  };
};
