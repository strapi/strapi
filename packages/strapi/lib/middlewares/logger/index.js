'use strict';

/**
 * Logger hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */
    initialize() {
      const {
        level,
        exposeInContext,
        requests,
      } = strapi.config.middleware.settings.logger;

      if (level) {
        strapi.log.level = strapi.config.middleware.settings.logger.level;
      }

      if (exposeInContext) {
        strapi.app.context.log = strapi.log;
      }

      if (requests && strapi.log.levelVal <= 20) {
        strapi.app.use(async (ctx, next) => {
          const start = Date.now();
          await next();
          const delta = Math.ceil(Date.now() - start);
          strapi.log.debug(`${ctx.method} ${ctx.url} (${delta} ms)`);
        });
      }
    },
  };
};
