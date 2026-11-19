import type { Core } from '@strapi/strapi';

// A factory with a required config: typed routes must pass `{ name, config }`.
export default (config: { max: number }, { strapi }: { strapi: Core.Strapi }) => {
  const handler: Core.MiddlewareHandler = async (ctx, next) => {
    strapi.log.debug(`${ctx.path}: at most ${config.max} requests`);
    await next();
  };

  return handler;
};
