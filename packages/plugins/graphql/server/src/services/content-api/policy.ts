import { get } from 'lodash';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { policy as policyUtils, errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

const { PolicyError } = errors;

/**
 * A resolved policy as the GraphQL resolvers run it. `Core.PolicyContext` describes the Koa context
 * of a REST route, while the GraphQL policy context has `parent`, `args`, `context`, `info`, `state`
 * and `http` (`createGraphQLPolicyContext`), so the handler's context is typed loosely here. The
 * handler is declared as a method, whose parameters TypeScript compares bivariantly, so the policies
 * the registry resolves are assignable to it.
 */
type GraphQLResolvedPolicy = {
  handler: {
    handler(ctx: unknown, config: unknown, opts: { strapi: Core.Strapi }): unknown;
  }['handler'];
  config: unknown;
};

const createPoliciesMiddleware = (resolverConfig: any, { strapi }: { strapi: Core.Strapi }) => {
  const resolverPolicies = get(resolverConfig, 'policies', []);
  const policies: GraphQLResolvedPolicy[] = strapi.get('policies').resolve(resolverPolicies, {});

  return async (
    resolve: GraphQLFieldResolver<any, any>,
    parent: any,
    args: any,
    context: any,
    info: GraphQLResolveInfo
  ) => {
    // Create a graphql policy context
    const policyContext = createGraphQLPolicyContext(parent, args, context, info);

    // Run policies & throw an error if one of them fails
    for (const { handler, config } of policies) {
      const result = await handler(policyContext, config, { strapi });

      // A policy passes when it returns `true` or nothing
      const passingResults: unknown[] = [true, undefined];

      if (passingResults.includes(result) === false) {
        throw new PolicyError();
      }
    }

    return resolve(parent, args, context, info);
  };
};

const createGraphQLPolicyContext = (
  parent: any,
  args: any,
  context: any,
  info: GraphQLResolveInfo
) => {
  const policyContext = {
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
  };

  return policyUtils.createPolicyContext('graphql', policyContext);
};

export { createPoliciesMiddleware };
