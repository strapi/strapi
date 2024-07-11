import type { Context } from 'koa';
import { getService } from '../utils';

export default {
  async createSchema(ctx: Context) {
    console.log(ctx.body, ctx.request.body);
    const { prompt, schema } = ctx.request.body as { prompt: string; schema: object | undefined };

    console.log('Start generating');
    ctx.body = await getService('architect').create(prompt, schema);
    console.log('Finished generating');
  },
};
