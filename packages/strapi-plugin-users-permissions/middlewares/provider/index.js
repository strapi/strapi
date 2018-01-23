'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const Grant = require('grant-koa');

module.exports = strapi => {
  return {
    beforeInitialize: function() {
      strapi.config.middleware.load.after.push('provider');
    },

    initialize: function(cb) {
      _.defaultsDeep(strapi.plugins['users-permissions'].config.grant, {
        server: {
          protocol: 'http',
          host: 'localhost:1337'
        }
      });

      const grant = new Grant(strapi.plugins['users-permissions'].config.grant);

      strapi.app.use(strapi.koaMiddlewares.compose(grant.middleware));

      cb();
    }
  };
};
