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

    initialize: function(cb) {
      if (strapi.config.middlewares.settings.logger === true) {
        strapi.app.use(async function(ctx, next) {
          const start = new Date();
          await next();
          const ms = new Date() - start;
          strapi.log.debug(ctx.method + ' ' + ctx.url + ' (' + ms + 'ms)');
        });
      }

      cb();
    }
  };
};
