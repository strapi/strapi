'use strict';

const RATE_LIMIT_MIDDLEWARE = 'plugin::users-permissions.rateLimit';
const contextQueues = new WeakMap();

const getRateLimitPath = (strapi, routeSuffix) => {
  const configuredPrefix = strapi.config.get('api.rest.prefix', '/api');
  const prefix = typeof configuredPrefix === 'string' ? configuredPrefix : '/api';
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const normalizedSuffix = routeSuffix.replace(/^\/+/, '');

  return `/${[normalizedPrefix, normalizedSuffix].filter(Boolean).join('/')}`;
};

const enqueueContextOperation = (koaContext, operation) => {
  const previous = contextQueues.get(koaContext) || Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);

  contextQueues.set(
    koaContext,
    result.catch(() => undefined)
  );

  return result;
};

const createRateLimitRunner = (strapi, routeSuffix) => {
  const rateLimit = strapi.middleware(RATE_LIMIT_MIDDLEWARE)({}, { strapi });
  const routePath = getRateLimitPath(strapi, routeSuffix);

  return (koaContext, { body, params }, controller) =>
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
        return koaContext.body;
      } finally {
        koaContext.request.path = originalPath;
        koaContext.request.body = originalBody;
        koaContext.params = originalParams;
        koaContext.body = originalResponseBody;
        koaContext.status = responseStatus;
      }
    });
};

module.exports = {
  createRateLimitRunner,
  getRateLimitPath,
};
