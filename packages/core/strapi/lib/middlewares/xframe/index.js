'use strict';

const convert = require('koa-convert');
const { xframe } = require('koa-lusca');

// FIXME
/* eslint-disable import/extensions */

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

        const { enabled, value } = strapi.config.get('middleware.settings.xframe', {});
        if (enabled) {
          return await convert(xframe(value))(ctx, next);
        }

        await next();
      });
    },
  };
};
