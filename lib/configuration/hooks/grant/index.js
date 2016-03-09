'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const Grant = require('grant-koa');

/**
 * Grant hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      authentication: {
        server: {
          protocol: strapi.config.ssl ? 'https' : 'http',
          host: strapi.config.host + ':' + strapi.config.port
        }
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      if (_.isPlainObject(strapi.config.authentication) && !_.isEmpty(strapi.config.authentication)) {
        const grant = new Grant(strapi.config.authentication);
        strapi.app.use(strapi.middlewares.mount(grant));
      }

      cb();
    }
  };

  return hook;
};
