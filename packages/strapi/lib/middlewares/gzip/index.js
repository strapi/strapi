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
      strapi.app.use(compress());
    },
  };
};
