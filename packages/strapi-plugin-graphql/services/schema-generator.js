'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const { gql, makeExecutableSchema } = require('apollo-server-koa');
const _ = require('lodash');
const graphql = require('graphql');
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
  const enablePlugins = strapi.plugins.graphql.config.enablePlugins !== false;

  // Generate type definition and query/mutation for models.
  const shadowCRUD = shadowCRUDEnabled ? buildModelsShadowCRUD() : createDefaultSchema();

  // Generate type definition and query/mutation for models inside plugins.
  const pluginCRUD = enablePlugins ? buildPluginModelsShadowCRUD() : createDefaultSchema();

  const _schema = strapi.plugins.graphql.config._schema.graphql;

  // Extract custom definition, query or resolver.
  const { definition, query, mutation, resolver = {} } = _schema;

  // Polymorphic.
  const polymorphicSchema = Types.addPolymorphicUnionType(
    definition + shadowCRUD.definition + pluginCRUD.definition
  );

  const builtResolvers = _.merge(
    {},
    shadowCRUD.resolvers,
    polymorphicSchema.resolvers,
    pluginCRUD.resolvers
  );

  const extraResolvers = diffResolvers(builtResolvers, _schema.resolver);

  const resolvers = _.merge({}, builtResolvers, buildResolvers(extraResolvers));

  // Return empty schema when there is no model.
  if (
    _.isEmpty(shadowCRUD.definition) &&
    _.isEmpty(pluginCRUD.definition) &&
    _.isEmpty(definition)
  ) {
    return {};
  }

  const queryFields = shadowCRUD.query && toSDL(shadowCRUD.query, resolver.Query, null, 'query');
  const queryPluginFields =
    pluginCRUD.query && toSDL(pluginCRUD.query, resolver.Query, null, 'query');

  const mutationFields =
    shadowCRUD.mutation && toSDL(shadowCRUD.mutation, resolver.Mutation, null, 'mutation');
  const mutationPluginFields =
    pluginCRUD.mutation && toSDL(pluginCRUD.mutation, resolver.Mutation, null, 'mutation');

  const scalars = Types.getScalars();

  Object.assign(resolvers, scalars);
  const scalarDef = Object.keys(scalars)
    .map(key => `scalar ${key}`)
    .join('\n');

  // Concatenate.
  let typeDefs = `
      ${definition}
      ${shadowCRUD.definition}
      ${pluginCRUD.definition}
      ${polymorphicSchema.definition}

      ${Types.addInput()}

      ${combineQueriesOrMutations('Query', queryFields, queryPluginFields, query)}
      ${combineQueriesOrMutations('Mutation', mutationFields, mutationPluginFields, mutation)}


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

  // Remove custom scalar (like Upload);
  typeDefs = Types.removeCustomScalar(typeDefs, resolvers);

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

  const components = Object.values(strapi.components);

  return mergeSchemas(createDefaultSchema(), ...buildModels([...models, ...components]));
};

const buildPluginModelsShadowCRUD = () => {
  const pluginModels = Object.values(strapi.plugins)
    .map(plugin => Object.values(plugin.models) || [])
    .reduce((acc, arr) => acc.concat(arr), []);

  return mergeSchemas(createDefaultSchema(), ...buildModels([...pluginModels]));
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

const combineQueriesOrMutations = (type, ...methods) => {
  methods = methods.join('\n').trim();
  if (!methods.length) {
    return '';
  }
  return `type ${type} {
    ${methods}
  }`;
};

module.exports = {
  generateSchema,
};
