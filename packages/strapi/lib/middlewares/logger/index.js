'use strict';

/**
 * Logger hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      const middlewareLogger = strapi.log.child();
      if (strapi.config.middleware.settings.logger.level) {
        middlewareLogger.level = strapi.config.middleware.settings.logger.level;
      }

      if (strapi.config.middleware.settings.logger.exposeInContext) {
        strapi.app.context.log = middlewareLogger;
      }

      if (strapi.config.middleware.settings.logger.requests && middlewareLogger.levelVal <= 20) {
        strapi.app.use(async (ctx, next) => {
          const start = Date.now();

          await next();

          const delta = Math.ceil(Date.now() - start);

          middlewareLogger.debug(`${ctx.method} ${ctx.url} (${delta} ms)`);
        });
      }

      cb();
    }
  };
};
