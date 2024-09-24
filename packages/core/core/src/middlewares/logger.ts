import type { Core } from '@strapi/types';

export const logger: Core.MiddlewareFactory = (_, { strapi }) => {
  return async (ctx, next) => {
    const start = Date.now();
    await next();
    const delta = Math.ceil(Date.now() - start);

    if (process.env.LOG_HEALTH === 'false' && ctx.url === '/_health') {
      return;
    } else {
      strapi.log.http(`${ctx.method} ${ctx.url} (${delta} ms) ${ctx.status}`);
    }
  };
};
