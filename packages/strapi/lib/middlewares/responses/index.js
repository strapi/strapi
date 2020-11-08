'use strict';

const _ = require('lodash');

module.exports = strapi => {
  return {
    initialize() {
      strapi.app.use(async (ctx, next) => {
        await next();

        const responseFn = strapi.config.get(['functions', 'responses', ctx.status]);
        if (_.isFunction(responseFn)) {
          await responseFn(ctx);
        }
      });
    },
  };
};
