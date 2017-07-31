'use strict';

/**
 * Module dependencies
 */

/**
 * CSRF hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      csrf: {
        enabled: false
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        strapi.koaMiddlewares.convert(
          strapi.koaMiddlewares.lusca.csrf({
            key: strapi.config.middleware.settings.csrf.key,
            secret: strapi.config.middleware.settings.csrf.secret
          })
        )
      );

      cb();
    }
  };
};
