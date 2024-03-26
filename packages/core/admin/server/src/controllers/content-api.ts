import type { Context } from 'koa';
import type { GetRoutes, GetPermissions } from '../../../shared/contracts/content-api';
import '@strapi/types';

export default {
  async getPermissions(ctx: Context) {
    const actionsMap = await strapi.contentAPI.permissions.getActionsMap();

    ctx.send({ data: actionsMap } satisfies GetPermissions.Response);
  },

  async getRoutes(ctx: Context) {
    const routesMap = await strapi.contentAPI.getRoutesMap();

    ctx.send({ data: routesMap } satisfies GetRoutes.Response);
  },
};
