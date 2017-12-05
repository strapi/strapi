'use strict';

/**
 * Module dependencies
 */

/**
 * P3P hook
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
            strapi.koaMiddlewares.lusca.p3p({
              value: strapi.config.middleware.settings.p3p.value
            })
          )(ctx, next);
        }
      );

      cb();
    }
  };
};
