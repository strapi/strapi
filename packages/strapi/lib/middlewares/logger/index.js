'use strict';

/**
 * Logger hook
 */

module.exports = function(strapi) {
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
      strapi.app.context.log = strapi.log;

      if (strapi.config.middleware.settings.logger.requests) {
        strapi.app.use(async (ctx, next) => {
          const start = Date.now();

          await next();

          const delta = Math.ceil(Date.now() - start);

          ctx.log.debug(`${ctx.method} ${ctx.url} (${delta} ms)`);
        });
      }

      cb();
    }
  };
};
