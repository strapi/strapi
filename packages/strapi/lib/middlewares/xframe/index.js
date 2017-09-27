'use strict';

/**
 * Module dependencies
 */

/**
 * CRON hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      xframe: {
        enabled: true,
        value: 'SAMEORIGIN'
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.app.use(
        async (ctx, next) => {
          if (ctx.admin) return next();

          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.xframe({
              value: strapi.config.middleware.settings.xframe.value
            })
          )(ctx, next);
        }
      );

      cb();
    }
  };
};
