'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

/**
 * Favicon hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      favicon: {
        path: 'favicon.ico',
        maxAge: 86400000
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        strapi.koaMiddlewares.favicon(
          path.resolve(strapi.config.appPath, strapi.config.middleware.settings.favicon.path),
          {
            maxAge: strapi.config.middleware.settings.favicon.maxAge
          }
        )
      );

      cb();
    }
  };
};
