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
        expose: [
          'WWW-Authenticate',
          'Server-Authorization'
        ],
        maxAge: 31536000,
        credentials: true,
        methods: [
          'GET',
          'POST',
          'PUT',
          'PATCH',
          'DELETE',
          'OPTIONS',
          'HEAD'
        ],
        headers: [
          'Content-Type',
          'Authorization'
        ],
        keepHeadersOnError: false
      }
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (_.isPlainObject(strapi.config.cors) && !_.isEmpty(strapi.config.cors)) {
        strapi.app.use(strapi.middlewares.kcors({
          origin: strapi.config.cors.origin,
          exposeHeaders: strapi.config.cors.expose,
          maxAge: strapi.config.cors.maxAge,
          credentials: strapi.config.cors.credentials,
          allowMethods: strapi.config.cors.methods,
          allowHeaders: strapi.config.cors.headers,
          keepHeadersOnError: strapi.config.cors.keepHeadersOnError
        }));
      }

      cb();
    }
  };
};
