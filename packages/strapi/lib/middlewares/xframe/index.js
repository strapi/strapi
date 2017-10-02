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
          if (ctx.request.admin) {
            return strapi.koaMiddlewares.convert(
              strapi.koaMiddlewares.lusca.xframe({
                enabled: this.defaults.xframe.enabled,
                value: this.defaults.xframe.value
              })
            )(ctx, next);
          } else if (strapi.config.currentEnvironment.security.xframe.enabled) {
            return strapi.koaMiddlewares.convert(
              strapi.koaMiddlewares.lusca.xframe({
                value: strapi.config.middleware.settings.xframe.value
              })
            )(ctx, next);
          }

          await next();
        }
      );

      cb();
    }
  };
};
