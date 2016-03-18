'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * Proxy hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      proxy: false
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      if (_.isString(strapi.config.proxy)) {
        strapi.app.use(strapi.middlewares.proxy({
          host: strapi.config.proxy
        }));
      }

      cb();
    }
  };

  return hook;
};
