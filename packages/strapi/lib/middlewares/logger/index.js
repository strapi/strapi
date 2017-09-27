'use strict';

/**
 * Logger hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      logger: {
        enabled: true
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      if (strapi.config.middleware.settings.logger.level) {
        strapi.log.level = strapi.config.middleware.settings.logger.level;
      }

      if (strapi.config.middleware.settings.logger.exposeInContext) {
        strapi.app.context.log = strapi.log;
      }

      if (strapi.config.middleware.settings.logger.requests && strapi.log.levelVal <= 20) {
        strapi.app.use(async (ctx, next) => {
          const start = Date.now();

          await next();

          const delta = Math.ceil(Date.now() - start);

          strapi.log.debug(`${ctx.method} ${ctx.url} (${delta} ms)`);
        });
      }

      cb();
    }
  };
};
