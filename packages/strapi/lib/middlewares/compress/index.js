'use strict';

/**
 * Compress hook
 */

const flush = require('zlib').Z_SYNC_FLUSH;

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

    initialize: function(cb) {
      strapi.app.use(
        strapi.koaMiddlewares.compress({
          threshold: 2048,
          flush
        })
      );

      cb();
    }
  };
};
