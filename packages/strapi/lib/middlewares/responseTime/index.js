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
      responseTime: {
        enabled: true
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(strapi.koaMiddlewares.responseTime());

      cb();
    }
  };
};
