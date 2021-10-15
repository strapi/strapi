'use strict';

/**
 * @typedef {import('@strapi/strapi').StrapiAppContext} StrapiAppContext
 */

module.exports = () => {
  /**
   * @param {StrapiAppContext} ctx
   * @param {() => Promise<void>} next
   */
  return async (ctx, next) => {
    const start = Date.now();

    await next();

    const delta = Math.ceil(Date.now() - start);
    ctx.set('X-Response-Time', delta + 'ms');
  };
};
