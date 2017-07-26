'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * CORS hook
 */

module.exports = strapi => {
  return {
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
        headers: ['Content-Type', 'Authorization'],
        keepHeadersOnError: false
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      if (
        _.isPlainObject(strapi.config.middleware.settings.cors) &&
        !_.isEmpty(strapi.config.middleware.settings.cors)
      ) {
        strapi.app.use(
          strapi.koaMiddlewares.kcors({
            origin: strapi.config.middleware.settings.cors.origin,
            exposeHeaders: strapi.config.middleware.settings.cors.expose,
            maxAge: strapi.config.middleware.settings.cors.maxAge,
            credentials: strapi.config.middleware.settings.cors.credentials,
            allowMethods: strapi.config.middleware.settings.cors.methods,
            allowHeaders: strapi.config.middleware.settings.cors.headers,
            keepHeadersOnError: strapi.config.middleware.settings.cors.keepHeadersOnError
          })
        );
      }

      cb();
    }
  };
};
