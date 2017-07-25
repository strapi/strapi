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
        _.isPlainObject(strapi.config.middlewares.settings.cors) &&
        !_.isEmpty(strapi.config.middlewares.settings.cors)
      ) {
        strapi.app.use(
          strapi.koaMiddlewares.kcors({
            origin: strapi.config.middlewares.settings.cors.origin,
            exposeHeaders: strapi.config.middlewares.settings.cors.expose,
            maxAge: strapi.config.middlewares.settings.cors.maxAge,
            credentials: strapi.config.middlewares.settings.cors.credentials,
            allowMethods: strapi.config.middlewares.settings.cors.methods,
            allowHeaders: strapi.config.middlewares.settings.cors.headers,
            keepHeadersOnError: strapi.config.middlewares.settings.cors.keepHeadersOnError
          })
        );
      }

      cb();
    }
  };
};
