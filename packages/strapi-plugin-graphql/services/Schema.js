'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const fs = require('fs');
const path = require('path');
const { gql, makeExecutableSchema } = require('apollo-server-koa');
const _ = require('lodash');
const graphql = require('graphql');
const Query = require('./Query.js');
const Mutation = require('./Mutation.js');
const Types = require('./Types.js');
const Resolvers = require('./Resolvers.js');

module.exports = {
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

  getDescription: (description, model = {}) => {
    const format = '"""\n';

    const str =
      _.get(description, '_description') || _.isString(description)
        ? description
        : undefined || _.get(model, 'info.description');

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
    // Generate type definition and query/mutation for models.
    const shadowCRUD =
      strapi.plugins.graphql.config.shadowCRUD !== false
        ? (() => {
            // Exclude core models.
          const models = Object.keys(strapi.models).filter(
              model => model !== 'core_store',
            );

            // Reproduce the same pattern for each plugin.
          return Object.keys(strapi.plugins).reduce((acc, plugin) => {
            const {
                definition,
                query,
                mutation,
                resolver,
              } = Resolvers.shadowCRUD(
                Object.keys(strapi.plugins[plugin].models),
                plugin,
              );

              // We cannot put this in the merge because it's a string.
            acc.definition += definition || '';

            return _.merge(acc, {
              query,
              resolver,
              mutation,
            });
          }, Resolvers.shadowCRUD(models));
        })()
        : { definition: '', query: '', mutation: '', resolver: '' };

    // Extract custom definition, query or resolver.
    const {
      definition,
      query,
      mutation,
      resolver = {},
    } = strapi.plugins.graphql.config._schema.graphql;

    // Polymorphic.
    const {
      polymorphicDef,
      polymorphicResolver,
    } = Types.addPolymorphicUnionType(definition, shadowCRUD.definition);

    // Build resolvers.
    const resolvers =
      _.omitBy(
        _.merge(shadowCRUD.resolver, resolver, polymorphicResolver),
        _.isEmpty,
      ) || {};

    // Transform object to only contain function.
    Object.keys(resolvers).reduce((acc, type) => {
      return Object.keys(acc[type]).reduce((acc, resolver) => {
        // Disabled this query.
        if (acc[type][resolver] === false) {
          delete acc[type][resolver];

          return acc;
        }

        if (!_.isFunction(acc[type][resolver])) {
          console.log(type, resolver);

          acc[type][resolver] = acc[type][resolver].resolver;
        }

        if (
          _.isString(acc[type][resolver]) ||
          _.isPlainObject(acc[type][resolver])
        ) {
          const { plugin = '' } = _.isPlainObject(acc[type][resolver])
            ? acc[type][resolver]
            : {};

          switch (type) {
            case 'Mutation':
              // TODO: Verify this...
              acc[type][resolver] = Mutation.composeMutationResolver(
                strapi.plugins.graphql.config._schema.graphql,
                plugin,
                resolver,
              );
              break;
            case 'Query':
            default:
              acc[type][resolver] = Query.composeQueryResolver(
                strapi.plugins.graphql.config._schema.graphql,
                plugin,
                resolver,
                'force', // Avoid singular/pluralize and force query name.
              );
              break;
          }
        }

        return acc;
      }, acc);
    }, resolvers);

    // Return empty schema when there is no model.
    if (_.isEmpty(shadowCRUD.definition) && _.isEmpty(definition)) {
      return {};
    }

    // Concatenate.
    let typeDefs = `
      ${definition}
      ${shadowCRUD.definition}
      type Query {${shadowCRUD.query &&
        this.formatGQL(
          shadowCRUD.query,
          resolver.Query,
          null,
          'query',
        )}${query}}
      type Mutation {${shadowCRUD.mutation &&
        this.formatGQL(
          shadowCRUD.mutation,
          resolver.Mutation,
          null,
          'mutation',
        )}${mutation}}
      ${Types.addCustomScalar(resolvers)}
      ${Types.addInput()}
      ${polymorphicDef}
    `;

    // Build schema.
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Write schema.
    this.writeGenerateSchema(graphql.printSchema(schema));

    // Remove custom scaler (like Upload);
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
    // Disable auto-reload.
    strapi.reload.isWatching = false;

    const generatedFolder = path.resolve(
      strapi.config.appPath,
      'plugins',
      'graphql',
      'config',
      'generated',
    );

    // Create folder if necessary.
    try {
      fs.accessSync(generatedFolder, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        fs.mkdirSync(generatedFolder);
      } else {
        console.error(err);
      }
    }

    fs.writeFileSync(path.join(generatedFolder, 'schema.graphql'), schema);

    strapi.reload.isWatching = true;
  },
};
