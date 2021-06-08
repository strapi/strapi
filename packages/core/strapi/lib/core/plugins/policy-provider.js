'use strict';

const { reduce } = require('lodash/fp');

module.exports = policiesDefinition => {
  const policiesArray = reduce(
    (policies, handler, name) => {
      policies.push({ name, handler });
      return policies;
    },
    [],
    policiesDefinition
  );

  const provider = policyName => provider.get(policyName);

  Object.assign(provider, {
    get(policyName) {
      return policiesDefinition[policyName];
    },
    getAll() {
      return policiesArray;
    },
  });

  return provider;
};
