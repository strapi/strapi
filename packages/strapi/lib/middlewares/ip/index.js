'use strict';

/**
 * Module dependencies
 */

/**
 * IP filter hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      ip: {
        enabled: false,
        whiteList: [],
        blackList: []
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        strapi.koaMiddlewares.convert(
          strapi.koaMiddlewares.ip({
            whiteList: strapi.config.middleware.settings.ip.whiteList,
            blackList: strapi.config.middleware.settings.ip.blackList
          })
        )
      );

      cb();
    }
  };
};
