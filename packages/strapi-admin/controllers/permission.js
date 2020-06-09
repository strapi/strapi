'use strict';

const { formatActionsBySections } = require('./formatters');

module.exports = {
  /**
   * Returns every permissions, in nested format
   * @param {KoaContext} ctx - koa context
   */
  async getAll(ctx) {
    const allActions = strapi.admin.services.permission.actionProvider.getAll();

    ctx.body = {
      data: {
        conditions: [],
        sections: formatActionsBySections(allActions),
      },
    };
  },
};
