'use strict';

const { propOr } = require('lodash/fp');
const policy = require('@strapi/utils/lib/policy');

const getPoliciesConfig = propOr([], 'config.policies');

const resolvePolicies = route => {
  const { pluginName, apiName } = route.info || {};
  const policiesConfig = getPoliciesConfig(route);

  const resolvedPolicies = policiesConfig.map(policyConfig =>
    policy.get(policyConfig, { pluginName, apiName })
  );

  const policiesMiddleware = async (ctx, next) => {
    const context = policy.createPolicyContext('koa', ctx);

    for (const resolvedPolicy of resolvedPolicies) {
      const result = await resolvedPolicy(context, { strapi });

      if (![true, undefined].includes(result)) {
        // TODO: make error clearer
        throw new Error('Policies failed.');
      }
    }

    await next();
  };

  return [policiesMiddleware];
};

module.exports = {
  resolvePolicies,
};
