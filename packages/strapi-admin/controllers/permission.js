'use strict';

module.exports = {
  /**
   * Returns every permissions, in nested format
   * @param {KoaContext} ctx - koa context
   */
  async getAll(ctx) {
    const allWithNestedFormat = strapi.admin.services[
      'permission-provider'
    ].getAllWithNestedFormat();

    ctx.body = {
      data: allWithNestedFormat,
    };
  },
};
