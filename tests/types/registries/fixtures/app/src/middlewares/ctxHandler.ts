import type { Context } from 'koa';

// A Koa handler with only a context: runtime calls it with the config and `{ strapi }`, which
// breaks. Its first parameter is a Koa context, so it registers `never` and typed routes reject its
// name.
export default (ctx: Context) => {
  ctx.set('X-Ctx-Handler', 'done');
};
