import type { Core } from '@strapi/types';

export const responseTime: Core.MiddlewareFactory = () => {
  return async (ctx, next) => {
    const start = Date.now();

    await next();

    const delta = Math.ceil(Date.now() - start);
    ctx.set('X-Response-Time', `${delta}ms`);
  };
};
