import type { Context, Middleware } from 'koa';
import type { Core } from '@strapi/types';
import type { AuthResponse } from '../../context';

const RATE_LIMIT_MIDDLEWARE = 'plugin::users-permissions.rateLimit';
const contextQueues = new WeakMap<Context, Promise<unknown>>();

/** Match REST rate-limit buckets even when the Content API uses a custom prefix. */
export const getRateLimitPath = (strapi: Core.Strapi, routeSuffix: string) => {
  const configuredPrefix = strapi.config.get('api.rest.prefix', '/api');
  const prefix = typeof configuredPrefix === 'string' ? configuredPrefix : '/api';
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const normalizedSuffix = routeSuffix.replace(/^\/+/, '');

  return `/${[normalizedPrefix, normalizedSuffix].filter(Boolean).join('/')}`;
};

const enqueueContextOperation = <T>(koaContext: Context, operation: () => Promise<T>) => {
  const previous = contextQueues.get(koaContext) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);

  contextQueues.set(
    koaContext,
    result.catch(() => undefined)
  );

  return result;
};

/** Serialize resolver calls sharing one Koa context and restore its state after each call. */
export const createRateLimitRunner = (strapi: Core.Strapi, routeSuffix: string) => {
  const rateLimit = (strapi.middleware(RATE_LIMIT_MIDDLEWARE) as Core.MiddlewareFactory)(
    {},
    { strapi }
  ) as Middleware;
  const routePath = getRateLimitPath(strapi, routeSuffix);

  return (
    koaContext: Context,
    { body, params }: { body: Record<string, unknown>; params?: Record<string, unknown> },
    controller: (ctx: Context) => Promise<unknown>
  ) =>
    enqueueContextOperation(koaContext, async () => {
      const originalBody = koaContext.request.body;
      const originalPath = koaContext.request.path;
      const originalParams = koaContext.params;
      const originalResponseBody = koaContext.body;
      let responseStatus = 200;

      koaContext.request.path = routePath;
      koaContext.request.body = body;
      if (params) {
        koaContext.params = params;
      }

      try {
        await rateLimit(koaContext, () => controller(koaContext));
        responseStatus = koaContext.status;
        return koaContext.body as AuthResponse;
      } finally {
        koaContext.request.path = originalPath;
        koaContext.request.body = originalBody;
        koaContext.params = originalParams;
        koaContext.body = originalResponseBody;
        koaContext.status = responseStatus;
      }
    });
};
