'use strict';

/**
 * Groups controller
 */

module.exports = {
  /**
   * GET /groups handler
   */
  async getGroups(ctx) {
    const data = await strapi
      .service('content-type-builder.groups')
      .listGroups();

    ctx.body = { data };
  },
};
