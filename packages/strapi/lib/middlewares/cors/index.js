'use strict';

/**
 * Module dependencies
 */

/**
 * CORS hook
 */

const defaults = require('./defaults.json');

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        async (ctx, next) => {
          if (ctx.request.admin) {
            return strapi.koaMiddlewares.kcors({
              origin: '*',
              exposeHeaders: defaults.cors.expose,
              maxAge: defaults.cors.maxAge,
              credentials: defaults.cors.credentials,
              allowMethods: defaults.cors.methods,
              allowHeaders: defaults.cors.headers,
              keepHeadersOnError: defaults.cors.keepHeadersOnError
            })(ctx, next);
          } else if (strapi.config.currentEnvironment.security.cors.enabled) {
            return strapi.koaMiddlewares.kcors({
              origin:function(ctx) {
                const whitelist =strapi.config.middleware.settings.cors.origin.split(',');
                const requestOrigin = ctx.accept.headers.origin;
                if (!whitelist.includes(requestOrigin)) {
                        return ctx.throw(`  ${requestOrigin} is not a valid origin`);
                }
                return requestOrigin;
              },
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
