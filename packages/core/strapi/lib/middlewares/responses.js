'use strict';

const { prop, isFunction } = require('lodash/fp');

/**
 * @param {any=} config
 */
module.exports = (config = {}) => {
  return async (ctx, next) => {
    await next();

    const status = ctx.status;
    const handler = prop(`handlers.${status}`, config);

    if (isFunction(handler)) {
      await handler(ctx);
    }
  };
};
