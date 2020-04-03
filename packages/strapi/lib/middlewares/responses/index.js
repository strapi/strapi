'use strict';

const _ = require('lodash');

module.exports = strapi => {
  return {
    initialize() {
      strapi.app.use(async (ctx, next) => {
        await next();

        const responseFn = _.get(strapi.functions, ['responses', ctx.status]);
        if (_.isFunction(responseFn)) {
          await responseFn(ctx);
        }
      });
    },
  };
};
