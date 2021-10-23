'use strict';

/**
 * @typedef {import('@strapi/strapi').StrapiAppContext} StrapiAppContext
 */

module.exports = () => {
  /**
   * @param {StrapiAppContext} ctx
   * @param {() => void} next
   */
  return (ctx, next) => next();
};
