'use strict';

/**
 * Module dependencies
 */

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
        enabled: false,
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

    initialize: function(cb) {
      strapi.app.use(
        async (ctx, next) => {
          if (ctx.request.admin) {
            return strapi.koaMiddlewares.kcors({
              origin: '*',
              exposeHeaders: this.defaults.cors.expose,
              maxAge: this.defaults.cors.maxAge,
              credentials: this.defaults.cors.credentials,
              allowMethods: this.defaults.cors.methods,
              allowHeaders: this.defaults.cors.headers,
              keepHeadersOnError: this.defaults.cors.keepHeadersOnError
            })(ctx, next);
          } else if (strapi.config.currentEnvironment.security.cors.enabled) {
            return strapi.koaMiddlewares.kcors({
              origin: strapi.config.middleware.settings.cors.origin,
              exposeHeaders: strapi.config.middleware.settings.cors.expose,
              maxAge: strapi.config.middleware.settings.cors.maxAge,
              credentials: strapi.config.middleware.settings.cors.credentials,
              allowMethods: strapi.config.middleware.settings.cors.methods,
              allowHeaders: strapi.config.middleware.settings.cors.headers,
              keepHeadersOnError: strapi.config.middleware.settings.cors.keepHeadersOnError
            })(ctx, next);
          }

          await next();
        }
      );

      cb();
    }
  };
};
