'use strict';

const { prop, isFunction } = require('lodash/fp');

module.exports = (options = {}) => {
  return async (ctx, next) => {
    await next();

    const status = ctx.status;
    const handler = prop(`handlers.${status}`, options);

    if (isFunction(handler)) {
      await handler(ctx);
    }
  };
};
