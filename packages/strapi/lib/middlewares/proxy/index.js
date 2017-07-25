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
      proxy: false
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      if (_.isString(strapi.config.middlewares.settings.proxy)) {
        strapi.app.use(
          strapi.koaMiddlewares.proxy({
            host: strapi.config.middlewares.settings.proxy
          })
        );
      }

      cb();
    }
  };
};
