import { Context } from 'koa';

export async function helloWorld(ctx: Context) {
  global.strapi.log.info('Hello World API');

  ctx.send('Hello World');
}
