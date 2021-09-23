'use strict';

const _ = require('lodash');

module.exports = strapi => {
  return {
    initialize() {
      strapi.server.use(async (ctx, next) => {
        await next();

        const status = ctx.status;
        const responseFn = strapi.config.get(`middleware.settings.responses.handlers.${status}`);
        if (_.isFunction(responseFn)) {
          await responseFn(ctx);
        }
      });
    },
  };
};
