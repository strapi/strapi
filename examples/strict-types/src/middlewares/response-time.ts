import type { Core } from '@strapi/strapi';

/** A TypeScript middleware: type generation reads its config from the factory's first parameter. */
export default ((config) => async (ctx, next) => {
  const start = Date.now();
  await next();
  ctx.set(config.header, `${Date.now() - start}ms`);
}) satisfies Core.MiddlewareFactory<{ header: string }>;
