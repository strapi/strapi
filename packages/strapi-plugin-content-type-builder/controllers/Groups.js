'use strict';

/**
 * Groups controller
 */

module.exports = {
  /**
   * GET /groups handler
   * Returns a list of available groups
   */
  async getGroups(ctx) {
    const data = await strapi.groupManager.all();
    ctx.body = { data };
  },

  /**
   * GET /groups/:uid
   * Returns a specific group
   * @param {*} ctx
   */
  async getGroup(ctx) {
    const { uid } = ctx.params;

    const group = await strapi.groupManager.get(uid);

    if (!group) {
      ctx.status = 404;
      ctx.body = {
        error: 'group.notFound',
      };
    }

    ctx.body = { data: group };
  },

  async createGroup() {},

  async updateGroup() {},

  async deleteGroup() {},
};
