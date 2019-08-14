'use strict';

const convert = require('koa-convert');
const { csp } = require('koa-lusca');
/**
 * CSP hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      strapi.router.use(async (ctx, next) => {
        if (ctx.request.admin) return await next();

        return await convert(csp(strapi.config.middleware.settings.csp))(
          ctx,
          next
        );
      });
    },
  };
};
