'use strict';

/**
 * Gzip hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      gzip: true
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      if (strapi.config.gzip === true) {
        strapi.app.use(strapi.middlewares.gzip());
      }

      cb();
    }
  };

  return hook;
};
