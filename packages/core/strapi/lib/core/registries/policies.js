'use strict';

const { pickBy, has } = require('lodash/fp');

const policiesRegistry = () => {
  const policies = {};

  return {
    get(policyUID) {
      return policies[policyUID];
    },
    getAll(prefix = '') {
      return pickBy((policy, policyUID) => policyUID.startsWith(prefix))(policies);
    },
    add(namespace, newPolicies) {
      for (const policyName in newPolicies) {
        const policy = newPolicies[policyName];
        const uid = `${namespace}.${policyName}`;

        if (has(uid, policies)) {
          throw new Error(`Policy ${uid} has already been registered.`);
        }
        policies[uid] = policy;
      }
    },
  };
};

module.exports = policiesRegistry;
