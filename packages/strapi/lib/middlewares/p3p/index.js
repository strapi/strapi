'use strict';

/**
 * Module dependencies
 */
const convert = require('koa-convert');
const { p3p } = require('koa-lusca');
/**
 * P3P hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      strapi.app.use(async (ctx, next) => {
        if (ctx.request.admin) return next();

        return await convert(p3p(strapi.config.middleware.settings.p3p))(
          ctx,
          next
        );
      });
    },
  };
};
