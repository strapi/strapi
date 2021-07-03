'use strict';

/**
 * Gzip hook
 */
const compress = require('koa-compress');

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      const { options = {} } = strapi.config.middleware.settings.gzip;
      strapi.app.use(compress(options));
    },
  };
};
