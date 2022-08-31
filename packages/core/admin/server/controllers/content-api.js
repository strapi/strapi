'use strict';

const { getService } = require('../utils');

module.exports = {
  async getPermissions(ctx) {
    const actionsMap = await strapi.contentAPI.permissions.getActionsMap();

    ctx.send({ data: actionsMap });
  },

  async getRoutes(ctx) {
    const contentApiService = getService('content-api');

    const routesMap = await contentApiService.getRoutes();

    ctx.send({ data: routesMap });
  },
};
