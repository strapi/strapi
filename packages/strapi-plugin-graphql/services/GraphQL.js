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

  formatGQL: function (fields, description = {}, type = 'field') {
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

  convertType: (attr = {}) => {
    // Type.
    if (attr.type) {
      switch (attr.type) {
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
    }

    const ref = attr.model || attr.collection;

    // Association.
    if (ref && ref !== '*') {
      // Add bracket or not.
      const plural = !_.isEmpty(attr.collection);
      const globalId = attr.plugin ?
        strapi.plugins[attr.plugin].models[ref].globalId:
        strapi.models[ref].globalId;

      if (plural) {
        return `[${globalId}]`;
      }

      return globalId;
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

  shadowCRUD: function (models, plugin) {
    const initialState = { definition: ``, query: {}, resolver: { Query : {} } };
    // Retrieve generic service from the Content Manager plugin.
    const resolvers = strapi.plugins['content-manager'].services['contentmanager'];

    if (_.isEmpty(models)) {
      return initialState;
    }

    return models.reduce((acc, name) => {
      const model = plugin ?
        strapi.plugins[plugin].models[name]:
        strapi.models[name];
      const params = {
        model: name
      };

      const queryOpts = plugin ? { source: plugin } : {};

      // Setup initial state with default attribute that should be displayed
      // but these attributes are not properly defined in the models.
      const initialState = {
        [model.primaryKey]: 'String'
      };

      // Add timestamps attributes.
      if (_.get(model, 'options.timestamps') === true) {
        Object.assign(initialState, {
          created_at: 'String',
          updated_at: 'String'
        });
      }

      const globalId = model.globalId;

      // Retrieve user customisation.
      const { resolver = {}, query, definition, _type = {} } = _.get(strapi.plugins, `graphql.config.schema.graphql`, {});

      // Convert our layer Model to the GraphQL DL.
      const attributes = Object.keys(model.attributes)
        .reduce((acc, attribute) => {
          // Convert our type to the GraphQL type.
          acc[attribute] = this.convertType(model.attributes[attribute]);

          return acc;
        }, initialState);

      acc.definition += `${this.getDescription(_type[globalId])}type ${globalId} ${this.formatGQL(attributes, _type[globalId])}\n\n`;

      Object.assign(acc.query, {
        [`${pluralize.plural(name)}`]: `[${model.globalId}]`,
        [`${pluralize.singular(name)}(id: String!)`]: model.globalId
      });

      // TODO
      // - Handle mutations.
      _.merge(acc.resolver, {
        Query : {
          [pluralize.plural(name)]: (obj, options, context) => this.composeResolver(
            context,
            plugin,
            _.get(resolver, `Query.${pluralize.plural(name)}.policy`),
            resolvers.fetchAll(params, {...queryOpts, ...options})
          ),
          [pluralize.singular(name)]: (obj, { id }, context) => this.composeResolver(
            context,
            plugin,
            _.get(resolver, `Query.${pluralize.singular(name)}.policy`),
            resolvers.fetch({ ...params, id }, queryOpts)
          )
        }
      });

      // Build associations queries.
      model.associations.forEach(association => {
        if (association.nature === 'manyMorphToMany') {
          return;
        }

        if (!acc.resolver[globalId]) {
          acc.resolver[globalId] = {};
        }

        // TODO:
        // - Handle limit, skip, etc options
        _.merge(acc.resolver[globalId], {
          [association.alias]: (obj, options, context) => {
            // Construct parameters object to retrieve the correct related entries.
            const params = {
              model: association.model || association.collection,
            };

            const queryOpts = {
              source: association.plugin
            };

            if (association.type === 'model') {
              params.id = obj[association.alias];
            } else {
              // Get attribute.
              const attr = association.plugin ?
                strapi.plugins[association.plugin].models[association.collection].attributes[association.via]:
                strapi.models[association.collection].attributes[association.via];

              // Get refering model.
              const ref = attr.plugin ?
                strapi.plugins[attr.plugin].models[attr.model || attr.collection]:
                strapi.models[attr.model || attr.collection];

              // Construct the "where" query to only retrieve entries which are
              // related to this entry.
              queryOpts.query = {
                [association.via]: obj[ref.primaryKey]
              };
            }

            return association.model ?
              resolvers.fetch(params, association.plugin):
              resolvers.fetchAll(params, queryOpts)
          }
        });
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
    // Generate type definition and query/mutation for models.
    const shadowCRUD = strapi.plugins.graphql.config.shadowCRUD !== false ? (() => {
      // Exclude core models.
      const models = Object.keys(strapi.models).filter(model => model !== 'core_store');

      // Reproduce the same pattern for each plugin.
      return Object.keys(strapi.plugins).reduce((acc, plugin) => {
        const { definition, query, resolver } = this.shadowCRUD(Object.keys(strapi.plugins[plugin].models), plugin);

        // We cannot put this in the merge because it's a string.
        acc.definition += definition || ``;

        return _.merge(acc, {
          query,
          resolver
        });
      }, this.shadowCRUD(models));
    })() : {};

    const { definition, query, _type, resolver } = strapi.plugins.graphql.config._schema.graphql;

    // Build resolvers.
    const resolvers = _.omitBy(_.merge(resolver, shadowCRUD.resolver), _.isEmpty) || {};

    // Return empty schema when there is no model.
    if (_.isEmpty(shadowCRUD.definition) && _.isEmpty(definition)) {
      return {};
    }

    // Concatenate.
    const typeDefs =
      definition +
      shadowCRUD.definition +
      `type Query ${this.formatGQL(shadowCRUD.query, {}, 'query')}\n`;

    console.log(typeDefs);

    // Write schema.
    this.writeGenerateSchema(typeDefs);

    // Build schema.
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Temporary variable to store the entire GraphQL configuration.
    delete strapi.plugins.graphql.config._schema.graphql;

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
