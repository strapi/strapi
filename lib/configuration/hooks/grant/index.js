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
      grant: {}
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      _.defaultsDeep(strapi.api.user.config.grant, {
        server: {
          protocol: strapi.config.ssl ? 'https' : 'http',
          host: strapi.config.host + ':' + strapi.config.port
        }
      });
      const grant = new Grant(strapi.api.user.config.grant);

      strapi.app.use(strapi.middlewares.mount(grant));

      cb();
    }
  };

  return hook;
};
