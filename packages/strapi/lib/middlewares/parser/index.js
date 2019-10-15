'use strict';

const body = require('koa-body');
const qs = require('koa-qs');

/**
 * Body parser hook
 */
module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      strapi.app.use((ctx, next) => {
        // disable for graphql
        // TODO: find a better way later
        if (ctx.url === '/graphql') return next();

        return body({
          patchKoa: true,
          ...strapi.config.middleware.settings.parser,
        })(ctx, next);
      });

      qs(strapi.app);
    },
  };
};
