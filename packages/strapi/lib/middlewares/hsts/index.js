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
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        async (ctx, next) => {
          if (ctx.request.admin) return next();

          return await strapi.koaMiddlewares.convert(
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
