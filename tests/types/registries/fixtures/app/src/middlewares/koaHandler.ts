import type { Core } from '@strapi/strapi';

// A plain Koa handler, not a factory: runtime calls it with the config and `{ strapi }`, which
// breaks. It registers `never`, so typed routes reject its name.
const koaHandler: Core.MiddlewareHandler = async (ctx, next) => {
  await next();
  ctx.set('X-Koa-Handler', 'done');
};

export default koaHandler;
