/**
 * @typedef {import('@strapi/strapi').StrapiAppContext} StrapiAppContext
 */

module.exports = {
  /**
   * @param {StrapiAppContext} ctx
   */
  findOne(ctx) {
    ctx.body = {};
  },

  /**
   * @param {StrapiAppContext} ctx
   */
  find(ctx) {
    ctx.body = [];
  },
};
