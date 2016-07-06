'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * SSL hook
 */

module.exports = strapi => {
  return {

    /**
     * Default options
     */

    defaults: {
      ssl: {
        disabled: true,
        trustProxy: false
      }
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (_.isPlainObject(strapi.config.ssl) && !_.isEmpty(strapi.config.ssl)) {
        strapi.app.use(strapi.middlewares.ssl({
          disabled: strapi.config.ssl.disabled,
          trustProxy: strapi.config.ssl.trustProxy
        }));
      }

      cb();
    }
  };
};
