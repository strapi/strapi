'use strict';

/**
 * Module dependencies
 */
const convert = require('koa-convert');
const { hsts } = require('koa-lusca');

/**
 * HSTS hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      strapi.app.use(async (ctx, next) => {
        if (ctx.request.admin) return next();

        return await convert(hsts(strapi.config.middleware.settings.hsts))(
          ctx,
          next
        );
      });
    },
  };
};
