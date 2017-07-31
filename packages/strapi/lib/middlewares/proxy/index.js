'use strict';

/**
 * Module dependencies
 */

/**
 * Proxy hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      proxy: {
        enabled: false
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        strapi.koaMiddlewares.proxy({
          host: strapi.config.middleware.settings.proxy.host
        })
      );

      cb();
    }
  };
};
