import { get, getOr, isFunction, first, isNil } from 'lodash/fp';

import { GraphQLObjectType, GraphQLResolveInfo } from 'graphql';
import Utils from '@strapi/utils';
import { createPoliciesMiddleware } from './policy';
import { Strapi } from '@strapi/strapi';
import { Context, Middleware } from 'koa';

const { ForbiddenError } = Utils.errors;
const introspectionQueries = [
  '__Schema',
  '__Type',
  '__Field',
  '__InputValue',
  '__EnumValue',
  '__Directive',
];

/**
 * Get & parse middlewares definitions from the resolver's config
 */
const parseMiddlewares = (resolverConfig: any, strapi: Strapi): ((...args: any) => any)[] => {
  const resolverMiddlewares = getOr([], 'middlewares', resolverConfig);

  // TODO: [v4] to factorize with compose endpoints (routes)
  return resolverMiddlewares.map((middleware: Middleware) => {
    if (isFunction(middleware)) {
      return middleware;
    }

    if (typeof middleware === 'string') {
      return (strapi.middleware as any)(middleware);
    }

    if (typeof middleware === 'object') {
      const { name, options = {} } = middleware;

      return (strapi.middleware as any)(name)(options);
    }

    throw new Error(
      `Invalid middleware type, expected (function,string,object), received ${typeof middleware}`
    );
  });
};

interface Args {
  schema: any;
  strapi: Strapi;
  extension?: any;
}
/**
 * Wrap the schema's resolvers if they've been
 * customized using the GraphQL extension service
 */
const wrapResolvers = ({ schema, strapi, extension = {} }: Args) => {
  // Get all the registered resolvers configuration
  const { resolversConfig = {} } = extension;

  // Fields filters
  const isValidFieldName = ([field]: [string, any]) => !field.startsWith('__');

  const typeMap = schema.getTypeMap();

  Object.entries(typeMap).forEach(([type, definition]) => {
    const isGraphQLObjectType = definition instanceof GraphQLObjectType;
    const isIgnoredType = introspectionQueries.includes(type);

    if (!isGraphQLObjectType || isIgnoredType) {
      return;
    }

    const fields = definition.getFields();
    const fieldsToProcess = Object.entries(fields).filter(isValidFieldName);

    for (const [fieldName, fieldDefinition] of fieldsToProcess) {
      const defaultResolver = get(fieldName);

      const path = `${type}.${fieldName}`;
      const resolverConfig = getOr({}, path, resolversConfig);

      const { resolve: baseResolver = defaultResolver } = fieldDefinition;

      // Parse & initialize the middlewares
      const middlewares = parseMiddlewares(resolverConfig, strapi);

      // Generate the policy middleware
      const policyMiddleware = createPoliciesMiddleware(resolverConfig);

      // Add the policyMiddleware at the end of the middlewares collection
      middlewares.push(policyMiddleware);

      // Bind every middleware to the next one
      const boundMiddlewares = middlewares.map((middleware, index, collection): any => {
        return (...args: any[]) =>
          middleware(
            // Make sure the last middleware in the list calls the baseResolver
            index >= collection.length - 1 ? baseResolver : boundMiddlewares[index + 1],
            ...args
          );
      });

      /**
       * GraphQL authorization flow
       */
      const authorize = async ({ context }: { context: Context }) => {
        const authConfig = get('auth', resolverConfig);
        const authContext = get('state.auth', context);

        const isValidType = ['Mutation', 'Query', 'Subscription'].includes(type);
        const hasConfig = !isNil(authConfig);

        const isAuthDisabled = authConfig === false;

        if ((isValidType || hasConfig) && !isAuthDisabled) {
          try {
            await strapi.auth.verify(authContext, authConfig);
          } catch (error) {
            throw new ForbiddenError();
          }
        }
      };

      /**
       * Base resolver wrapper that handles authorization, middlewares & policies
       */
      fieldDefinition.resolve = async (parent, args, context, info: GraphQLResolveInfo) => {
        await authorize({ context });

        // Execute middlewares (including the policy middleware which will always be included)
        return first(boundMiddlewares).call(null, parent, args, context, info);
      };
    }
  });

  return schema;
};

export { wrapResolvers };
