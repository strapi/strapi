'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

const policiesRegistry = () => {
  const policies = {};

  return {
    get(policyUID) {
      return policies[policyUID];
    },
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(policies);
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
    extend(policyUID, extendFn) {
      const currentPolicy = this.get(policyUID);
      if (!currentPolicy) {
        throw new Error(`Policy ${policyUID} doesn't exist`);
      }
      const newPolicy = extendFn(currentPolicy);
      policies[policyUID] = newPolicy;
    },
  };
};

module.exports = policiesRegistry;
