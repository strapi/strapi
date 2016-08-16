'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * Proxy hook
 */

module.exports = strapi => {
  return {

    /**
     * Default options
     */

    defaults: {
      proxy: false
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (_.isString(strapi.config.proxy)) {
        strapi.app.use(strapi.middlewares.proxy({
          host: strapi.config.proxy
        }));
      }

      cb();
    }
  };
};
