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
      strapi.app.use(async function(ctx, next) {
        const start = new Date();
        await next();
        const ms = new Date() - start;
        strapi.log.debug(ctx.method + ' ' + ctx.url + ' (' + ms + 'ms)');
      });

      cb();
    }
  };
};
