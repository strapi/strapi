import { Context } from 'koa';
import { ContentTypeNotFoundError, GroupNameFieldNotFound } from '../../../shared/errors';
import { PLUGIN_ID } from '../../../shared/constants';
import { GroupResult, GroupResultItem, GroupResultMeta } from '../../../shared/contracts';

const service = () => strapi.plugin(PLUGIN_ID).service('groups');

const execute = async (ctx, promise): Promise<any> => {
  try {
    const result = await promise;
    ctx.body = result;
  } catch (error) {
    if (error instanceof ContentTypeNotFoundError || error instanceof GroupNameFieldNotFound) {
      return ctx.badRequest(error.message);
    }
    return ctx.internalServerError(error.message);
  }
}

const groups = {
  async getItemsWithGroups(ctx: Context) {
    await execute(ctx, service().getItemsWithGroups(ctx) as Promise<GroupResultItem[]>);
  },
  async getGroup(ctx: Context) {
    await execute(ctx, service().getGroup(ctx) as Promise<GroupResult>);
  },
  async getGroupsWithItems(ctx: Context) {
    await execute(ctx, service().getGroupsWithItems(ctx) as Promise<GroupResult[]>);
  },
  async getGroupNames(ctx: Context) {
    await execute(ctx, service().getGroupNames(ctx) as Promise<GroupResultMeta[]>);
  }
};

export default groups;
