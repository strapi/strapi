'use strict';

/**
 * Gzip hook
 */

module.exports = strapi => {
  return {

    /**
     * Default options
     */

    defaults: {
      gzip: true
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (strapi.config.gzip === true) {
        strapi.app.use(strapi.middlewares.compress());
      }

      cb();
    }
  };
};
