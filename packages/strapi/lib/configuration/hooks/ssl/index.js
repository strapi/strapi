'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * SSL hook
 */

module.exports = function (strapi) {
  const hook = {

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

    initialize: function (cb) {
      if (_.isPlainObject(strapi.config.ssl) && !_.isEmpty(strapi.config.ssl)) {
        strapi.app.use(strapi.middlewares.ssl({
          disabled: strapi.config.ssl.disabled,
          trustProxy: strapi.config.ssl.trustProxy
        }));
      }

      cb();
    }
  };

  return hook;
};
