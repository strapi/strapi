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
          whiteList: strapi.config.middleware.settings.ip.whiteList,
          blackList: strapi.config.middleware.settings.ip.blackList
        })
      );

      cb();
    }
  };
};
