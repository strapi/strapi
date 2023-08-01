import type { MiddlewareFactory } from './types';

export const responseTime: MiddlewareFactory = () => {
  return async (ctx, next) => {
    const start = Date.now();

    await next();

    const delta = Math.ceil(Date.now() - start);
    ctx.set('X-Response-Time', `${delta}ms`);
  };
};
