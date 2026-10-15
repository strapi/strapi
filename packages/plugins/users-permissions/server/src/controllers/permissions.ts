import type { Context } from 'koa';
import _ from 'lodash';
import type { PluginContext } from '../types';
import { createExtensibleController } from './create-extensible-controller';
import { getService } from '../utils';

/** Create controller actions for this Strapi instance. */
export default createExtensibleController(({ strapi }: PluginContext) => ({
  async getPermissions(ctx: Context) {
    const permissions = await getService(strapi, 'users-permissions').getActions();

    ctx.send({ permissions });
  },

  async getPolicies(ctx: Context) {
    const policies = _.keys(strapi.plugin('users-permissions').policies);

    ctx.send({
      policies: _.without(policies, 'permissions'),
    });
  },

  async getRoutes(ctx: Context) {
    const routes = await getService(strapi, 'users-permissions').getRoutes();

    ctx.send({ routes });
  },
}));
