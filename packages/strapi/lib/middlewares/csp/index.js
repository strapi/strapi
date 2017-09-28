'use strict';

/**
 * Module dependencies
 */

/**
 * CSP hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      csp: {
        enabled: false
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        strapi.koaMiddlewares.convert(
          strapi.koaMiddlewares.lusca.csp(strapi.config.middleware.settings.csp)
        )
      );

      cb();
    }
  };
};
