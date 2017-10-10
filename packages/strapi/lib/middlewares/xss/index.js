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
     * Default options
     */

    defaults: {
      xss: {
        enabled: false,
        mode: 'block'
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
              strapi.koaMiddlewares.lusca.xssProtection({
                enabled: true,
                mode: this.defaults.xss.mode
              })
            )(ctx, next);
          } else if (strapi.config.currentEnvironment.security.xss.enabled) {
            strapi.koaMiddlewares.convert(
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
