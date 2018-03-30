'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const policyUtils = require('strapi-utils').policy;

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const pluralize = require('pluralize');
const { makeExecutableSchema } = require('graphql-tools');

module.exports = {

  /**
   * Receive an Object and return a string which is following the GraphQL specs.
   *
   * @return String
   */

  formatGQL: function (fields, description, type = 'field') {
    const typeFields = JSON.stringify(fields, null, 2).replace(/['",]+/g, '');
    const lines = typeFields.split('\n');

    // Try to add description for field.
    if (type === 'field') {
      return lines
        .map((line, index) => {
          if ([0, lines.length - 1].includes(index)) {
            return line;
          }

          const split = line.split(':');
          const attribute = _.trim(split[0]);
          const info = description[attribute];

          if (info) {
            return `  """\n    ${info}\n  """\n${line}`;
          }

          return line;
        })
        .join('\n');
    }

    return typeFields;
  },

  /**
   * Retrieve description from variable and return a string which follow the GraphQL specs.
   *
   * @return String
   */

  getDescription: (description) => {
    const format = `"""\n`;

    const str = _.get(description, `_description`) || description;

    if (str) {
      return `${format}${str}\n${format}`;
    }

    return ``;
  },

  /**
   * Convert Strapi type to GraphQL type.
   *
   * @return String
   */

  convertType: (type) => {
    switch (type) {
      case 'string':
      case 'text':
        return 'String';
      case 'boolean':
        return 'Boolean';
      case 'integer':
        return 'Int';
      default:
        return 'String';
    }
  },

  /**
   * Execute policies before the specified resolver.
   *
   * @return Promise or Error.
   */

  composeResolver: async (context, plugin, policies = [], resolver) => {
    const policiesFn = [];

    // Populate policies.
    policies.forEach(policy => policyUtils.get(policy, plugin, policiesFn, 'GraphQL error'));

    // Execute policies stack.
    const policy = await strapi.koaMiddlewares.compose(policiesFn)(context);

    // Policy doesn't always return errors but they update the current context.
    if (_.isError(context.response.body) || _.get(context.response.body, 'isBoom')) {
      return context.response.body;
    }

    // When everything is okay, the policy variable should be undefined
    // so it will return the resolver instead.
    return policy || resolver;
  },

  /**
   * Construct the GraphQL query & definition and apply the right resolvers.
   *
   * @return Object
   */

  shadowCRUD: function (models) {
    const initialState = { definition: ``, query: {}, resolver: {} };
    // Retrieve generic service from the Content Manager plugin.
    const resolvers = strapi.plugins['content-manager'].services['contentmanager'];

    if (_.isEmpty(models)) {
      return initialState;
    }

    return models.reduce((acc, model) => {
      const plugin = undefined;
      const params = {
        model
      };

      const queryOpts = {};

      // Setup initial state with default attribute that should be displayed
      // but these attributes are not properly defined in the models.
      const initialState = {
        [strapi.models[model].primaryKey]: 'String'
      };

      // Add timestamps attributes.
      if (strapi.models[model].options.timestamps === true) {
        Object.assign(initialState, {
          created_at: 'String',
          updated_at: 'String'
        });
      }

      const globalId = strapi.models[model].globalId;

      // Retrieve user customisation.
      const { resolver = {}, query, definition, _type = {} } = _.get(strapi.api, `${model}.config.schema.graphql`, {});

      // Convert our layer Model to the GraphQL DL.
      const attributes = Object.keys(strapi.models[model].attributes)
        .reduce((acc, attribute) => {
          // Convert our type to the GraphQL type.
          acc[attribute] = this.convertType(strapi.models[model].attributes[attribute].type);

          return acc;
        }, initialState);

      acc.definition += `${this.getDescription(_type[globalId])}type ${globalId} ${this.formatGQL(attributes, _type[globalId])}\n\n`;

      Object.assign(acc.query, {
        [`${pluralize.plural(model)}`]: `[${strapi.models[model].globalId}]`,
        [`${pluralize.singular(model)}(id: String!)`]: strapi.models[model].globalId
      });

      // TODO
      // - Handle mutations.
      Object.assign(acc.resolver, {
        [pluralize.plural(model)]: (obj, options, context) => this.composeResolver(
          context,
          plugin,
          _.get(resolver, `Query.${pluralize.plural(model)}.policy`),
          resolvers.fetchAll(params, {...queryOpts, ...options})
        ),
        [pluralize.singular(model)]: (obj, { id }, context) => this.composeResolver(
          context,
          plugin,
          _.get(resolver, `Query.${pluralize.singular(model)}.policy`),
          resolvers.fetch({ ...params, id }, queryOpts)
        )
      });

      return acc;
    }, initialState);
  },

  /**
   * Generate GraphQL schema.
   *
   * @return Schema
   */

  generateSchema: function () {
    // Exclude core models.
    const models = Object.keys(strapi.models).filter(model => model !== 'core_store');

    // Generate type definition and query/mutation for models.
    const shadowCRUD = strapi.plugins.graphql.config.shadowCRUD !== false ? this.shadowCRUD(models) : {};

    // Build resolvers.
    const resolvers = {
      Query: shadowCRUD.resolver || {}
    };

    // Return empty schema when there is no model.
    if (_.isEmpty(shadowCRUD.definition)) {
      return {};
    }

    // Concatenate.
    const typeDefs = shadowCRUD.definition + `type Query ${this.formatGQL(shadowCRUD.query, {}, 'query')}`;

    console.log(typeDefs);

    // Write schema.
    this.writeGenerateSchema(typeDefs);

    // Build schema.
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    return schema;
  },

  /**
   * Save into a file the readable GraphQL schema.
   *
   * @return void
   */

  writeGenerateSchema(schema) {
    // Disable auto-reload.
    strapi.reload.isWatching = false;

    const generatedFolder = path.resolve(strapi.config.appPath, 'plugins', 'graphql', 'config', 'generated');

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
  }

};
