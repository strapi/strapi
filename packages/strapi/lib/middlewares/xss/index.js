'use strict';

/**
 * Module dependencies
 */

/**
 * XSS hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      xss: {
        enabled: false,
        mode: 'block'
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        strapi.koaMiddlewares.convert(
          strapi.koaMiddlewares.lusca.xssProtection({
            enabled: strapi.config.middleware.settings.xss.enabled,
            mode: strapi.config.middleware.settings.xss.mode
          })
        )
      );

      cb();
    }
  };
};
