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
      const serverConf = {
        server: {
          protocol: strapi.config.ssl ? 'https' : 'http',
          host: strapi.config.host + ':' + strapi.config.port
        }
      };
      _.defaultsDeep(strapi.config.grant, serverConf);
      const grant = new Grant(strapi.config.grant);
      strapi.app.use(strapi.middlewares.mount(grant));

      cb();
    }
  };

  return hook;
};
