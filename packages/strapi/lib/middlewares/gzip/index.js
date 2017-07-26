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

    initialize: function(cb) {
      if (strapi.config.middleware.settings.gzip === true) {
        strapi.app.use(strapi.koaMiddlewares.compress());
      }

      cb();
    }
  };
};
