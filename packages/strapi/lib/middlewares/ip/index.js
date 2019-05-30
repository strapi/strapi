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
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        strapi.koaMiddlewares.ip({
          whitelist: strapi.config.middleware.settings.ip.whiteList,
          blacklist: strapi.config.middleware.settings.ip.blackList
        })
      );

      cb();
    }
  };
};
