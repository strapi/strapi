export default {
  async getPermissions(ctx: any) {
    const actionsMap = await strapi.contentAPI.permissions.getActionsMap();

    ctx.send({ data: actionsMap });
  },

  async getRoutes(ctx: any) {
    const routesMap = await strapi.contentAPI.getRoutesMap();

    ctx.send({ data: routesMap });
  },
};
