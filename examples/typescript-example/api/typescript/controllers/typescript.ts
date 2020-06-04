import { Context } from 'koa';

const { strapi } = global;

export async function helloWorld(ctx: Context) {
  strapi.log.info('Hello World API');

  ctx.send('Hello World');
}
