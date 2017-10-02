'use strict';

/**
 * Module dependencies
 */

/**
 * HSTS hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      hsts: {
        enabled: true,
        maxAge: 31536000,
        includeSubDomains: true
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        async (ctx, next) => {
          if (ctx.request.admin) return next();

          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.hsts({
              maxAge: strapi.config.middleware.settings.hsts.maxAge,
              includeSubDomains: strapi.config.middleware.settings.hsts.includeSubDomains
            })
          )(ctx, next);
        }
      );

      cb();
    }
  };
};
