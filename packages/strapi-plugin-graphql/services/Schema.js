'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const { gql, makeExecutableSchema } = require('apollo-server-koa');
const _ = require('lodash');
const graphql = require('graphql');
const Query = require('./Query.js');
const Mutation = require('./Mutation.js');
const Types = require('./Types.js');
const Resolvers = require('./Resolvers.js');
const { mergeSchemas, createDefaultSchema } = require('./utils');

const schemaBuilder = {
  /**
   * Receive an Object and return a string which is following the GraphQL specs.
   *
   * @return String
   */

  formatGQL: function(fields, description = {}, model = {}, type = 'field') {
    const typeFields = JSON.stringify(fields, null, 2).replace(/['",]+/g, '');

    const lines = typeFields.split('\n');

    // Try to add description for field.
    if (type === 'field') {
      return lines
        .map(line => {
          if (['{', '}'].includes(line)) {
            return '';
          }

          const split = line.split(':');
          const attribute = _.trim(split[0]);
          const info =
            (_.isString(description[attribute])
              ? description[attribute]
              : _.get(description[attribute], 'description')) ||
            _.get(model, `attributes.${attribute}.description`);
          const deprecated =
            _.get(description[attribute], 'deprecated') ||
            _.get(model, `attributes.${attribute}.deprecated`);

          // Snakecase an attribute when we find a dash.
          if (attribute.indexOf('-') !== -1) {
            line = `  ${_.snakeCase(attribute)}: ${_.trim(split[1])}`;
          }

          if (info) {
            line = `  """\n    ${info}\n  """\n${line}`;
          }

          if (deprecated) {
            line = `${line} @deprecated(reason: "${deprecated}")`;
          }

          return line;
        })
        .join('\n');
    } else if (type === 'query' || type === 'mutation') {
      return lines
        .map((line, index) => {
          if (['{', '}'].includes(line)) {
            return '';
          }

          const split = Object.keys(fields)[index - 1].split('(');
          const attribute = _.trim(split[0]);
          const info = _.get(description[attribute], 'description');
          const deprecated = _.get(description[attribute], 'deprecated');

          // Snakecase an attribute when we find a dash.
          if (attribute.indexOf('-') !== -1) {
            line = `  ${_.snakeCase(attribute)}(${_.trim(split[1])}`;
          }

          if (info) {
            line = `  """\n    ${info}\n  """\n${line}`;
          }

          if (deprecated) {
            line = `${line} @deprecated(reason: "${deprecated}")`;
          }

          return line;
        })
        .join('\n');
    }

    return lines
      .map((line, index) => {
        if ([0, lines.length - 1].includes(index)) {
          return '';
        }

        return line;
      })
      .join('\n');
  },

  /**
   * Retrieve description from variable and return a string which follow the GraphQL specs.
   *
   * @return String
   */

  getDescription: (type, model = {}) => {
    const format = '"""\n';

    const str = _.get(type, '_description') || _.get(model, 'info.description');

    if (str) {
      return `${format}${str}\n${format}`;
    }

    return '';
  },

  /**
   * Generate GraphQL schema.
   *
   * @return Schema
   */

  generateSchema: function() {
    const shadowCRUDEnabled =
      strapi.plugins.graphql.config.shadowCRUD !== false;

    // Generate type definition and query/mutation for models.
    const shadowCRUD = shadowCRUDEnabled
      ? this.buildShadowCRUD()
      : createDefaultSchema();

    // Extract custom definition, query or resolver.
    const {
      definition,
      query,
      mutation,
      resolver = {},
    } = strapi.plugins.graphql.config._schema.graphql;

    // Polymorphic.
    const polymorphicSchema = Types.addPolymorphicUnionType(
      definition + shadowCRUD.definition
    );

    // Build resolvers.
    const resolvers =
      _.omitBy(
        _.merge(shadowCRUD.resolvers, resolver, polymorphicSchema.resolvers),
        _.isEmpty
      ) || {};

    this.buildResolvers(resolvers);

    // Return empty schema when there is no model.
    if (_.isEmpty(shadowCRUD.definition) && _.isEmpty(definition)) {
      return {};
    }

    const queryFields = this.formatGQL(
      shadowCRUD.query,
      resolver.Query,
      null,
      'query'
    );

    const mutationFields = this.formatGQL(
      shadowCRUD.mutation,
      resolver.Mutation,
      null,
      'mutation'
    );

    // Concatenate.
    let typeDefs = `
      ${definition}
      ${shadowCRUD.definition}
      ${polymorphicSchema.definition}

      ${Types.addInput()}

      type Query {
        ${queryFields}
        ${query}
      }

      type Mutation {
        ${mutationFields}
        ${mutation}
      }

      ${Types.addCustomScalar(resolvers)}
    `;

    // // Build schema.
    if (!strapi.config.currentEnvironment.server.production) {
      // Write schema.
      const schema = makeExecutableSchema({
        typeDefs,
        resolvers,
      });

      this.writeGenerateSchema(graphql.printSchema(schema));
    }

    // Remove custom scalar (like Upload);
    typeDefs = Types.removeCustomScalar(typeDefs, resolvers);

    return {
      typeDefs: gql(typeDefs),
      resolvers,
    };
  },

  /**
   * Save into a file the readable GraphQL schema.
   *
   * @return void
   */

  writeGenerateSchema: schema => {
    return strapi.fs.writeAppFile('exports/graphql/schema.graphql', schema);
  },

  buildShadowCRUD() {
    const modelSchema = Resolvers.buildShadowCRUD(
      _.omitBy(strapi.models, model => model.internal === true)
    );

    const pluginSchemas = Object.keys(strapi.plugins).reduce((acc, plugin) => {
      const schemas = Resolvers.buildShadowCRUD(strapi.plugins[plugin].models);
      return acc.concat(schemas);
    }, []);

    const componentSchemas = Object.values(strapi.components).map(compo =>
      Resolvers.buildComponent(compo)
    );

    const schema = { definition: '', resolvers: {}, query: {}, mutation: {} };
    mergeSchemas(schema, modelSchema, ...pluginSchemas, ...componentSchemas);

    return schema;
  },

  buildResolvers(resolvers) {
    // Transform object to only contain function.
    Object.keys(resolvers).reduce((acc, type) => {
      if (graphql.isScalarType(acc[type])) {
        return acc;
      }

      return Object.keys(acc[type]).reduce((acc, resolverName) => {
        const resolverObj = acc[type][resolverName];
        // Disabled this query.
        if (resolverObj === false) {
          delete acc[type][resolverName];

          return acc;
        }

        if (_.isFunction(resolverObj)) {
          return acc;
        }

        const plugin =
          _.get(resolverObj, ['plugin']) ||
          _.get(resolverObj, ['resolver', 'plugin']);

        switch (type) {
          case 'Mutation': {
            const resolver =
              _.get(resolverObj, ['resolver', 'handler']) ||
              _.get(resolverObj, ['resolver']);

            let name, action;

            if (_.isString(resolver)) {
              [name, action] = resolver.split('.');
            } else {
              name = null;
              action = resolverName;
            }

            const mutationResolver = Mutation.composeMutationResolver({
              _schema: strapi.plugins.graphql.config._schema.graphql,
              plugin,
              name: _.toLower(name),
              action,
            });

            acc[type][resolverName] = mutationResolver;
            break;
          }
          case 'Query':
          default: {
            acc[type][resolverName] = Query.composeQueryResolver({
              _schema: strapi.plugins.graphql.config._schema.graphql,
              plugin,
              name: resolverName,
              isSingular: 'force', // Avoid singular/pluralize and force query name.
            });
            break;
          }
        }

        return acc;
      }, acc);
    }, resolvers);
  },
};

module.exports = schemaBuilder;
