'use strict';

const { propOr } = require('lodash/fp');
const policy = require('@strapi/utils/lib/policy');

const { bodyPolicy } = policy;

const getPoliciesConfig = propOr([], 'config.policies');

const resolvePolicies = (route, opts = {}) => {
  const policiesConfig = getPoliciesConfig(route);

  const policies = policiesConfig.map(policyName => policy.get(policyName, opts));
  return [...policies, bodyPolicy];
};

module.exports = {
  resolvePolicies,
};
