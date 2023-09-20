import { policy as policyUtils, errors } from '@strapi/utils';
import { Common } from '@strapi/types';

const resolvePolicies = (route: Common.Route) => {
  const policiesConfig = route?.config?.policies ?? [];
  const resolvedPolicies = policyUtils.resolve(policiesConfig, route.info);

  const policiesMiddleware: Common.MiddlewareHandler = async (ctx, next) => {
    const context = policyUtils.createPolicyContext('koa', ctx);

    for (const { handler, config } of resolvedPolicies) {
      const result = await handler(context, config, { strapi });

      if (![true, undefined].includes(result)) {
        throw new errors.PolicyError();
      }
    }

    await next();
  };

  return [policiesMiddleware];
};

export { resolvePolicies };
