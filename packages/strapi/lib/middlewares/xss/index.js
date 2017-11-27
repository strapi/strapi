'use strict';

/**
 * Module dependencies
 */

/**
 * XSS hook
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
              strapi.koaMiddlewares.lusca.xssProtection({
                enabled: true,
                mode: defaults.xss.mode
              })
            )(ctx, next);
          } else if (strapi.config.currentEnvironment.security.xss.enabled) {
            return await strapi.koaMiddlewares.convert(
              strapi.koaMiddlewares.lusca.xssProtection({
                enabled: strapi.config.middleware.settings.xss.enabled,
                mode: strapi.config.middleware.settings.xss.mode
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
