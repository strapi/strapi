import type { Context } from 'koa';
import { getService } from '../utils';

export default {
  async updateSchema(ctx: Context) {
    const { data } = ctx.request.body;

    console.dir(data, { depth: null });

    const contentTypeService = getService('content-types');

    // TODO: validate input

    strapi.reload.isWatching = false;

    await contentTypeService.updateSchema(data);

    setImmediate(() => strapi.reload());

    ctx.send(204);
  },
};
