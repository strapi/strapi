'use strict';

/**
 * @typedef {import('@strapi/strapi').StrapiAppContext} StrapiAppContext
 */

const { prop, isFunction } = require('lodash/fp');

/**
 * @param {any=} config
 */
module.exports = (config = {}) => {
  /**
   * @param {StrapiAppContext} ctx
   * @param {() => Promise<void>} next
   */
  return async (ctx, next) => {
    await next();

    const status = ctx.status;
    const handler = prop(`handlers.${status}`, config);

    if (isFunction(handler)) {
      await handler(ctx);
    }
  };
};
