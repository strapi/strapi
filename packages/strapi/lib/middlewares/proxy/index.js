'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

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
          host: strapi.config.middleware.settings.proxy
        })
      );

      cb();
    }
  };
};
