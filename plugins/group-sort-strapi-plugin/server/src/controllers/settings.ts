import { Context } from 'koa';
import { ContentTypeNotFoundError, GroupNameFieldNotFound } from '../../../shared/errors';
import { PLUGIN_ID } from '../../../shared/constants';

const service = () => strapi.plugin(PLUGIN_ID).service('settings');

const execute = async (ctx, promise): Promise<any> => {
  try {
    const result = await promise;
    if(result) {
      ctx.body = result;
    }
  } catch (error) {
    if (error instanceof ContentTypeNotFoundError) {
      return ctx.badRequest(error.message);
    }
    return ctx.internalServerError(error.message);
  }
}

const settings = {
  async getSettings(ctx: Context) {
    await execute(ctx, service().getSettings(ctx));
  },
  async updateSettings(ctx: Context) {
    await execute(ctx, service().updateSettings(ctx));
  }
};

export default settings;
