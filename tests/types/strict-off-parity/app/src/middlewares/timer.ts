import type { Core } from '@strapi/strapi';

const timer: Core.MiddlewareFactory = () => {
  return async (ctx, next) => {
    const start = Date.now();
    await next();
    ctx.set('X-Response-Time', `${Date.now() - start}ms`);
  };
};

export default timer;
