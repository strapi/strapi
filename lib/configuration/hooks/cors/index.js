'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * CORS hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      cors: {
        origin: true,
        expose: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 31536000,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
        headers: ['Content-Type', 'Authorization']
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      if (_.isPlainObject(strapi.config.cors) && !_.isEmpty(strapi.config.cors)) {
        strapi.app.use(strapi.middlewares.cors({
          origin: strapi.config.cors.origin,
          expose: strapi.config.cors.expose,
          maxAge: strapi.config.cors.maxAge,
          credentials: strapi.config.cors.credentials,
          methods: strapi.config.cors.methods,
          headers: strapi.config.cors.headers
        }));
      }

      cb();
    }
  };

  return hook;
};
