import type { Core } from '@strapi/strapi';

// A factory without parameters takes no config.
export default (): Core.MiddlewareHandler => async (ctx, next) => {
  await next();
  ctx.set('X-Timer', 'done');
};
