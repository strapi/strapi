'use strict';

/**
 * Module dependencies
 */
const convert = require('koa-convert');
const { csrf } = require('koa-lusca');

/**
 * CSRF hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      strapi.app.use(async (ctx, next) => {
        if (ctx.request.admin) return await next();

        return await convert(csrf(strapi.config.middleware.settings.csrf))(
          ctx,
          next
        );
      });
    },
  };
};
