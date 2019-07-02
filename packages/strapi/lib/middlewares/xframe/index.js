'use strict';

const convert = require('koa-convert');
const { xframe } = require('koa-lusca');

/**
 * CRON hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      const defaults = require('./defaults.json');

      strapi.app.use(async (ctx, next) => {
        if (ctx.request.admin) {
          return await convert(xframe(defaults.xframe))(ctx, next);
        }

        if (strapi.config.currentEnvironment.security.xframe.enabled) {
          return await convert(
            xframe(strapi.config.middleware.settings.xframe.value)
          )(ctx, next);
        }

        await next();
      });
    },
  };
};
