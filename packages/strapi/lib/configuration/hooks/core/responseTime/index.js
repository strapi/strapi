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

    initialize: cb => {
      if (strapi.config.responseTime === true) {
        strapi.app.use(strapi.middlewares.responseTime());
      }

      cb();
    }
  };
};
