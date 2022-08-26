'use strict';

module.exports = {
  async getPermissions(ctx) {
    const actionsMap = await strapi.contentAPI.permissions.getActionsMap();

    ctx.send({ data: actionsMap });
  },
};
