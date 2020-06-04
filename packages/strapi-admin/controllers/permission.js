'use strict';

module.exports = {
  /**
   * Returns every permissions, in nested format
   * @param {KoaContext} ctx - koa context
   */
  async getAll(ctx) {
    const allWithNestedFormat = await strapi.admin.permissionProvider.getAllWithNestedFormat();

    ctx.body = {
      data: allWithNestedFormat,
    };
  },
};
