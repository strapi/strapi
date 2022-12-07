import { propOr } from 'lodash/fp';
import Utils from '@strapi/utils';
import { GraphQLResolveInfo } from 'graphql';
import { Context } from 'koa';

const { PolicyError, policy: policyUtils } = Utils;

const getPoliciesConfig = propOr([], 'policies');

const createPoliciesMiddleware = (resolverConfig: any) => {
  const resolverPolicies = getPoliciesConfig(resolverConfig);
  const policies = policyUtils.resolve(resolverPolicies);

  return async (resolve: any, parent: any, args: any, ctx: Context, info: GraphQLResolveInfo) => {
    // Create a graphql policy context
    const context = createGraphQLPolicyContext(parent, args, ctx, info);

    // Run policies & throw an error if one of them fails
    for (const { handler, config } of policies) {
      const result = await handler(context, config, { strapi });

      if (![true, undefined].includes(result)) {
        throw new PolicyError();
      }
    }

    return resolve(parent, args, ctx, info);
  };
};

const createGraphQLPolicyContext = (parent: any, args: any, context: any, info: any) => {
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

export { createPoliciesMiddleware };
