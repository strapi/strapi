'use strict';

const { propOr } = require('lodash/fp');
const { PolicyError } = require('@strapi/utils').errors;
const { policy: policyUtils } = require('@strapi/utils');

const getPoliciesConfig = propOr([], 'config.policies');

const resolvePolicies = (route) => {
  const policiesConfig = getPoliciesConfig(route);
  const resolvedPolicies = policyUtils.resolve(policiesConfig, route.info);

  const policiesMiddleware = async (ctx, next) => {
    const context = policyUtils.createPolicyContext('koa', ctx);

    for (const { handler, config } of resolvedPolicies) {
      const result = await handler(context, config, { strapi });

      if (![true, undefined].includes(result)) {
        throw new PolicyError();
      }
    }

    await next();
  };

  return [policiesMiddleware];
};

module.exports = {
  resolvePolicies,
};
