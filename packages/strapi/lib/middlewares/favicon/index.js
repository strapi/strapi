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
