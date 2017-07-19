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
      logger: true
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (strapi.config.logger === true) {
        strapi.app.use(async function (ctx, next) {
          const start = new Date();
          await next();
          const ms = new Date() - start;

          // Choose logger type depending on the response status.
          const logger = ctx.status < 400 ? strapi.log.debug : strapi.log.error;

          // Finally, log the string.
          logger(`${ctx.ip} - [${start.toISOString()}] ${ctx.method} ${ctx.status} ${ctx.url} (${ms}ms)`);
        });
      }

      cb();
    }
  };
};
