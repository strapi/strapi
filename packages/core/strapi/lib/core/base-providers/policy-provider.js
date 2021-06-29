'use strict';

module.exports = policiesDefinition => {
  const provider = {};
  const policies = new Map(Object.entries(policiesDefinition));

  Object.assign(provider, {
    has(policyName) {
      return policies.has(policyName);
    },
    get(policyName) {
      return policies.get(policyName);
    },
    getAll() {
      return Array.from(policies.values());
    },
    get size() {
      return policies.size;
    },
  });

  return provider;
};
