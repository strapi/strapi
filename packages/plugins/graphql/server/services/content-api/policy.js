'use strict';

const { getOr } = require('lodash/fp');
const { policy: policyUtils } = require('@strapi/utils');

const createPoliciesMiddleware = (resolverConfig, { strapi }) => {
  return async (resolve, ...rest) => {
    const resolverPolicies = getOr([], 'policies', resolverConfig);

    // Transform every policy into a unique format
    const policies = resolverPolicies.map(policy => policyUtils.get(policy));

    // Create a graphql policy context
    const context = createGraphQLPolicyContext(...rest);

    // Run policies & throw an error if one of them fails
    for (const policy of policies) {
      const result = await policy({ context, strapi });

      if (!result) {
        throw new Error('Policies failed');
      }
    }

    return resolve(...rest);
  };
};

const createGraphQLPolicyContext = (parent, args, context, info) => {
  return policyUtils.createPolicyContext('graphql', {
    get parent() {
      return parent;
    },

    get args() {
      return args;
    },

    get context() {
      return context;
    },

    get info() {
      return info;
    },

    get state() {
      return this.context.state;
    },

    get http() {
      return this.context.koaContext;
    },
  });
};

module.exports = {
  createPoliciesMiddleware,
};
