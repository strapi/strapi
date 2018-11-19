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
     * Initialize the hook
     */

    initialize: function(cb) {
      const defaults = require('./defaults.json');
      
      strapi.app.use(
        async (ctx, next) => {
          if (ctx.request.admin) {
            return await strapi.koaMiddlewares.convert(
              strapi.koaMiddlewares.lusca.xframe({
                enabled: defaults.xframe.enabled,
                value: defaults.xframe.value
              })
            )(ctx, next);
          } else if (strapi.config.currentEnvironment.security.xframe.enabled) {
            return await strapi.koaMiddlewares.convert(
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
