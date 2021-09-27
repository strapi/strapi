'use strict';

const { propOr } = require('lodash/fp');
const policy = require('@strapi/utils/lib/policy');

const { bodyPolicy } = policy;

const getPoliciesConfig = propOr([], 'config.policies');

const resolvePolicies = route => {
  const { pluginName, apiName } = route.info || {};
  const policiesConfig = getPoliciesConfig(route);

  const policiesMiddleware = async (ctx, next) => {
    const context = policy.createPolicyContext('koa', ctx);

    for (const policyName of policiesConfig) {
      const resolvedPolicy = await policy.get(policyName, { pluginName, apiName });
      const result = await resolvedPolicy({ ctx: context, strapi });

      if (![true, undefined].includes(result)) {
        throw new Error('Policies failed.');
      }
    }

    await next();
  };

  return [policiesMiddleware, bodyPolicy];
};

module.exports = {
  resolvePolicies,
};
