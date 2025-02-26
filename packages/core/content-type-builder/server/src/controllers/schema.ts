import type { Context } from 'koa';
import { getService } from '../utils';

const internals = {
  isUpdating: false,
};

export default {
  async updateSchema(ctx: Context) {
    const { data } = ctx.request.body;

    internals.isUpdating = true;

    // TODO: validate input

    strapi.reload.isWatching = false;

    await getService('schema').updateSchema(data);

    setImmediate(() => {
      strapi.reload();
    });

    ctx.send(204);
  },

  async getUpdateSchemaStatus(ctx: Context) {
    ctx.send({ data: { isUpdating: internals.isUpdating } });
  },
};
