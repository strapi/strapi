import { Context } from 'koa';
import { ContextWithParams } from 'strapi';

const { strapi } = global;

interface IGreetingParams {
  name: string;
}

export async function helloWorld(ctx: Context) {
  strapi.log.info('Hello World API');

  ctx.send('Hello World');
}

export async function greeting(ctx: ContextWithParams<IGreetingParams>) {
  const { params: { name } } = ctx;

  strapi.log.info('Greeting API');

  ctx.send(`Hello ${ name }`);
}
