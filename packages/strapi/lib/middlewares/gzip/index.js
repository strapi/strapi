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
      gzip: {
        enabled: false
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(strapi.koaMiddlewares.compress());

      cb();
    }
  };
};
