'use strict';

const body = require('koa-body');
const qs = require('koa-qs');

/**
 * Body parser hook
 */
module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      strapi.app.use(
        body({
          patchKoa: true,
          ...strapi.config.middleware.settings.parser,
        })
      );

      qs(strapi.app);
    },
  };
};
