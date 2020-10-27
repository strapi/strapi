'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const { gql, makeExecutableSchema } = require('apollo-server-koa');
const _ = require('lodash');
const graphql = require('graphql');
const PublicationState = require('../types/publication-state');
const Types = require('./type-builder');
const { buildModels } = require('./type-definitions');
const { mergeSchemas, createDefaultSchema, diffResolvers } = require('./utils');
const { toSDL } = require('./schema-definitions');
const { buildQuery, buildMutation } = require('./resolvers-builder');

/**
 * Generate GraphQL schema.
 *
 * @return Schema
 */

const generateSchema = () => {
  const shadowCRUDEnabled = strapi.plugins.graphql.config.shadowCRUD !== false;

  // Generate type definition and query/mutation for models.
  const shadowCRUD = shadowCRUDEnabled ? buildModelsShadowCRUD() : createDefaultSchema();

  const _schema = strapi.plugins.graphql.config._schema.graphql;

  // Extract custom definition, query or resolver.
  const { definition, query, mutation, resolver = {} } = _schema;

  // Polymorphic.
  const polymorphicSchema = Types.addPolymorphicUnionType(definition + shadowCRUD.definition);

  const builtResolvers = _.merge({}, shadowCRUD.resolvers, polymorphicSchema.resolvers);

  const extraResolvers = diffResolvers(_schema.resolver, builtResolvers);

  const resolvers = _.merge({}, builtResolvers, buildResolvers(extraResolvers));

  // Return empty schema when there is no model.
  if (_.isEmpty(shadowCRUD.definition) && _.isEmpty(definition)) {
    return {};
  }

  const queryFields = shadowCRUD.query && toSDL(shadowCRUD.query, resolver.Query, null, 'query');

  const mutationFields =
    shadowCRUD.mutation && toSDL(shadowCRUD.mutation, resolver.Mutation, null, 'mutation');

  Object.assign(resolvers, PublicationState.resolver);

  const scalars = Types.getScalars();

  Object.assign(resolvers, scalars);

  const scalarDef = Object.keys(scalars)
    .map(key => `scalar ${key}`)
    .join('\n');

  // Concatenate.
  let typeDefs = `
      ${definition}
      ${shadowCRUD.definition}
      ${polymorphicSchema.definition}

      ${Types.addInput()}
      
      ${PublicationState.definition}

      type AdminUser {
        id: ID!
        username: String
        firstname: String!
        lastname: String!
      }

      type Query {
        ${queryFields}
        ${query}
      }

      type Mutation {
        ${mutationFields}
        ${mutation}
      }

      ${scalarDef}
    `;

  // Build schema.
  if (strapi.config.environment !== 'production') {
    // Write schema.
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    writeGenerateSchema(graphql.printSchema(schema));
  }

  return {
    typeDefs: gql(typeDefs),
    resolvers,
  };
};

/**
 * Save into a file the readable GraphQL schema.
 *
 * @return void
 */

const writeGenerateSchema = schema => {
  return strapi.fs.writeAppFile('exports/graphql/schema.graphql', schema);
};

const buildModelsShadowCRUD = () => {
  const models = Object.values(strapi.models).filter(model => model.internal !== true);

  const pluginModels = Object.values(strapi.plugins)
    .map(plugin => Object.values(plugin.models) || [])
    .reduce((acc, arr) => acc.concat(arr), []);

  const components = Object.values(strapi.components);

  return mergeSchemas(
    createDefaultSchema(),
    ...buildModels([...models, ...pluginModels, ...components])
  );
};

const buildResolvers = resolvers => {
  // Transform object to only contain function.
  return Object.keys(resolvers).reduce((acc, type) => {
    if (graphql.isScalarType(resolvers[type])) {
      return acc;
    }

    return Object.keys(resolvers[type]).reduce((acc, resolverName) => {
      const resolverObj = resolvers[type][resolverName];

      // Disabled this query.
      if (resolverObj === false) return acc;

      if (_.isFunction(resolverObj)) {
        return _.set(acc, [type, resolverName], resolverObj);
      }

      switch (type) {
        case 'Mutation': {
          _.set(acc, [type, resolverName], buildMutation(resolverName, resolverObj));

          break;
        }
        default: {
          _.set(acc, [type, resolverName], buildQuery(resolverName, resolverObj));
          break;
        }
      }

      return acc;
    }, acc);
  }, {});
};

module.exports = {
  generateSchema,
};
