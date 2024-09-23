import { policy as policyUtils, errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

const createPolicicesMiddleware = (route: Core.Route, strapi: Core.Strapi) => {
  const policiesConfig = route?.config?.policies ?? [];
  const resolvedPolicies = strapi.get('policies').resolve(policiesConfig, route.info);

  const policiesMiddleware: Core.MiddlewareHandler = async (ctx, next) => {
    const context = policyUtils.createPolicyContext('koa', ctx);

    for (const { handler, config } of resolvedPolicies) {
      const result = await handler(context, config, { strapi });

      if (![true, undefined].includes(result)) {
        throw new errors.PolicyError();
      }
    }

    await next();
  };

  return policiesMiddleware;
};

export { createPolicicesMiddleware };
