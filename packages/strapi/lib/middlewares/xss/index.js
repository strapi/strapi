'use strict';

const convert = require('koa-convert');
const { xssProtection } = require('koa-lusca');
/**
 * XSS hook
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
          return await convert(
            xssProtection({
              enabled: true,
              mode: defaults.xss.mode,
            })
          )(ctx, next);
        }

        if (strapi.config.currentEnvironment.security.xss.enabled) {
          return await convert(
            xssProtection(strapi.config.middleware.settings.xss)
          )(ctx, next);
        }

        await next();
      });
    },
  };
};
