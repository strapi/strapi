'use strict';

/**
 * X-Response-Time hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      responseTime: true
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      if (strapi.config.responseTime === true) {
        strapi.app.use(strapi.middlewares.responseTime());
      }

      cb();
    }
  };

  return hook;
};
