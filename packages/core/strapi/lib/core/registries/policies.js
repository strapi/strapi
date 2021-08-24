'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace } = require('../utils');

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
        const uid = addNamespace(policyName, namespace);

        if (has(uid, policies)) {
          throw new Error(`Policy ${uid} has already been registered.`);
        }
        policies[uid] = policy;
      }
    },
  };
};

module.exports = policiesRegistry;
