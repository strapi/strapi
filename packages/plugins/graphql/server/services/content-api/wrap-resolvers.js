'use strict';

const { isNil, get, getOr, isFunction, first } = require('lodash/fp');

const { createPoliciesMiddleware } = require('./policy');

/**
 * Wrap the schema's resolvers if they've been
 * customized using the GraphQL extension service
 * @param {object} options
 * @param {GraphQLSchema} options.schema
 * @param {object} options.extension
 * @return {GraphQLSchema}
 */
const wrapResolvers = ({ schema, extension = {} }) => {
  // Get all the registered resolvers configuration
  const { resolversConfig = {} } = extension;

  // Fields filters
  const isValidFieldName = ([field]) => !field.startsWith('__');
  const hasResolverConfig = type => ([field]) => !isNil(resolversConfig[`${type}.${field}`]);

  const typeMap = get('_typeMap', schema);

  // Iterate over every field from every type within the
  // schema's type map and wrap its resolve attribute if needed
  Object.entries(typeMap).forEach(([type, definition]) => {
    const fields = get('_fields', definition);

    if (isNil(fields)) {
      return;
    }

    const fieldsToProcess = Object.entries(fields)
      // Ignore patterns such as "__FooBar"
      .filter(isValidFieldName)
      // Don't augment the types if there isn't any configuration defined for them
      .filter(hasResolverConfig(type));

    for (const [fieldName, fieldDefinition] of fieldsToProcess) {
      const path = `${type}.${fieldName}`;
      const resolverConfig = resolversConfig[path];

      const { resolve: baseResolver = get(fieldName) } = fieldDefinition;

      const middlewares = parseMiddlewares(resolverConfig);

      // Generate the policy middleware
      const policyMiddleware = createPoliciesMiddleware(resolverConfig, { strapi });

      // Add the policyMiddleware at the end of the middlewares collection
      middlewares.push(policyMiddleware);

      // Bind every middleware to the next one
      const boundMiddlewares = middlewares.map((middleware, index, collection) => {
        return (...args) =>
          middleware(
            // Make sure the last middleware in the list calls the baseResolver
            index >= collection.length - 1 ? baseResolver : boundMiddlewares[index + 1],
            ...args
          );
      });

      // Replace the base resolver by a custom function which will handle authorization, middlewares & policies
      fieldDefinition.resolve = async (parent, args, context, info) => {
        if (resolverConfig.auth !== false) {
          try {
            await strapi.auth.verify(context.state.auth, resolverConfig.auth);
          } catch (error) {
            // TODO: [v4] Throw GraphQL Error instead
            throw new Error('Forbidden access');
          }
        }

        // Execute middlewares (including the policy middleware which will always be included)
        return first(boundMiddlewares).call(null, parent, args, context, info);
      };
    }
  });

  return schema;
};

/**
 * Get & parse middlewares definitions from the resolver's config
 * @param {object} resolverConfig
 * @return {function[]}
 */
const parseMiddlewares = resolverConfig => {
  const resolverMiddlewares = getOr([], 'middlewares', resolverConfig);

  // TODO: [v4] to factorize with compose endpoints (routes)
  return resolverMiddlewares.map(middleware => {
    if (isFunction(middleware)) {
      return middleware;
    }

    if (typeof middleware === 'string') {
      return strapi.middleware(middleware);
    }

    if (typeof middleware === 'object') {
      const { name, options = {} } = middleware;

      return strapi.middleware(name)(options);
    }
  });
};

module.exports = { wrapResolvers };
