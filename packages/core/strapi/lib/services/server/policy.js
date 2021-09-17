'use strict';

const { propOr } = require('lodash/fp');
const policy = require('@strapi/utils/lib/policy');

const { bodyPolicy } = policy;

const getPoliciesConfig = propOr([], 'config.policies');

const resolvePolicies = route => {
  const { pluginName, apiName } = route.info || {};
  const policiesConfig = getPoliciesConfig(route);

  const policies = policiesConfig.map(policyName => {
    return policy.get(policyName, { pluginName, apiName });
  });

  return [...policies, bodyPolicy];
};

module.exports = {
  resolvePolicies,
};
