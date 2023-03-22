'use strict';

module.exports = {
  async getPermissions(ctx) {
    const actionsMap = await strapi.contentAPI.permissions.getActionsMap();

    ctx.send({ data: actionsMap });
  },

  async getRoutes(ctx) {
    const routesMap = await strapi.contentAPI.getRoutesMap();

    ctx.send({ data: routesMap });
  },
};
