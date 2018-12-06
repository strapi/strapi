'use strict';

/**
 * Module dependencies
 */

/**
 * CSRF hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        async (ctx, next) => {
          if (ctx.request.admin) return await next();

          return await strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.csrf({
              key: strapi.config.middleware.settings.csrf.key,
              secret: strapi.config.middleware.settings.csrf.secret
            })
          )(ctx, next);
        }
      );

      cb();
    }
  };
};
