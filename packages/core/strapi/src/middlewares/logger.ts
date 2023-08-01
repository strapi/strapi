import type { MiddlewareFactory } from './types';

export const logger: MiddlewareFactory = (_, { strapi }) => {
  return async (ctx, next) => {
    const start = Date.now();
    await next();
    const delta = Math.ceil(Date.now() - start);

    strapi.log.http(`${ctx.method} ${ctx.url} (${delta} ms) ${ctx.status}`);
  };
};
