'use strict';

/**
 * Compress hook
 */

module.exports = strapi => {
  return {

    /**
     * Default options
     */

    defaults: {
      compress: true
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      strapi.app.use(strapi.middlewares.compress({
        threshold: 2048,
        flush: require('zlib').Z_SYNC_FLUSH
      }));

      cb();
    }
  };
};
