'use strict';

/**
 * X-Response-Time hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      responseTime: true
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      if (strapi.config.middlewares.settings.responseTime === true) {
        strapi.app.use(strapi.koaMiddlewares.responseTime());
      }

      cb();
    }
  };
};
