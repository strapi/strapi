import type { Context } from 'koa';

export default {
  async updateSchema(ctx: Context) {
    const { data } = ctx.request.body;

    console.log(data);

    const { components, contentTypes } = data;

    setTimeout(() => {
      strapi.reload();
    }, 3000);

    return { status: 'ok' };
  },
};
