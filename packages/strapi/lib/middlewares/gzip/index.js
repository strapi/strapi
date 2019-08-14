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
      strapi.router.use(compress());
    },
  };
};
