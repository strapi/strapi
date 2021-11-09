'use strict';

const { propOr } = require('lodash/fp');
const { policy: policyUtils } = require('@strapi/utils');
const { ForbiddenError } = require('@strapi/utils').errors;

const getPoliciesConfig = propOr([], 'policies');

const createPoliciesMiddleware = (resolverConfig, { strapi }) => {
  const resolverPolicies = getPoliciesConfig(resolverConfig);
  const policies = policyUtils.resolve(resolverPolicies);

  return async (resolve, ...rest) => {
    // Create a graphql policy context
    const context = createGraphQLPolicyContext(...rest);

    // Run policies & throw an error if one of them fails
    for (const { handler, config } of policies) {
      const result = await handler(context, config, { strapi });

      if (![true, undefined].includes(result)) {
        throw new ForbiddenError('Policies failed.');
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
