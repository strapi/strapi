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
     * Default options
     */

    defaults: {
      p3p: {
        enabled: false,
        value: ''
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
