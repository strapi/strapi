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
const graphql = require('graphql');
const { makeExecutableSchema } = require('graphql-tools');
const GraphQLJSON = require('graphql-type-json');


module.exports = {

  /**
   * Receive an Object and return a string which is following the GraphQL specs.
   *
   * @return String
   */

  formatGQL: function (fields, description = {}, model = {}, type = 'field') {
    const typeFields = JSON.stringify(fields, null, 2).replace(/['",]+/g, '');
    const lines = typeFields.split('\n');

    // Try to add description for field.
    if (type === 'field') {
      return lines
        .map((line, index) => {
          if ([0, lines.length - 1].includes(index)) {
            return ``;
          }

          const split = line.split(':');
          const attribute = _.trim(split[0]);
          const info = description[attribute] || _.get(model, `attributes.${attribute}.description`);

          if (info) {
            return `  """\n    ${info}\n  """\n${line}`;
          }

          return line;
        })
        .join('\n');
    }


    return lines
        .map((line, index) => {
          if ([0, lines.length - 1].includes(index)) {
            return ``;
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
    const format = `"""\n`;

    const str = _.get(description, `_description`) ||
      _.isString(description) ? description : undefined ||
      model.description;

    if (str) {
      return `${format}${str}\n${format}`;
    }

    return ``;
  },

  convertToParams: (params) => {
    return Object.keys(params).reduce((acc, current) => {
      return Object.assign(acc, {
        [`_${current}`]: params[current]
      });
    }, {});
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

  composeResolver: async function (obj, options, context, _schema, plugin, name, isSingular) {
    const params = {
      model: name
    };

    const queryOpts = plugin ? { source: plugin } : {};

    // Retrieve generic service from the Content Manager plugin.
    const resolvers = strapi.plugins['content-manager'].services['contentmanager'];

    // Extract custom resolver or _type description.
    const { resolver: handler = {} } = _schema;

    // Retrieve policies.
    const policies = isSingular ?
      _.get(handler, `Query.${pluralize.singular(name)}.policy`, []):
      _.get(handler, `Query.${pluralize.plural(name)}.policy`, []);

    // Retrieve resolver. It could be the custom resolver of the user
    // or the shadow CRUD resolver (aka Content-Manager).
    const resolver = (() => {
      if (isSingular) {
        return _.get(handler, `Query.${pluralize.singular(name)}.resolver`,
          async () => {
            const value = await resolvers.fetch({ ...params, id: options.id }, queryOpts);

            return value.toJSON ? value.toJSON() : value;
          }
        );
      }

      const resolver = _.get(handler, `Query.${pluralize.plural(name)}.resolver`,
        async () => {
          const convertedParams = strapi.utils.models.convertParams(name, this.convertToParams(options));
          const where = strapi.utils.models.convertParams(name, options.where || {});

          // Content-Manager specificity.
          convertedParams.skip = convertedParams.start;
          convertedParams.query = where.where;

          const value = await resolvers.fetchAll(params, {...queryOpts, ...convertedParams});

          return value.toJSON ? value.toJSON() : value;
        }
      );

      return resolver;
    })();

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

    // Note: The resolver can be a function or promise.
    return policy || _.isFunction(resolver) ? resolver.call(null, obj, options, context) : resolver;
  },

  /**
   * Construct the GraphQL query & definition and apply the right resolvers.
   *
   * @return Object
   */

  shadowCRUD: function (models, plugin) {
    // Retrieve generic service from the Content Manager plugin.
    const resolvers = strapi.plugins['content-manager'].services['contentmanager'];

    const initialState = { definition: ``, query: {}, resolver: { Query : {} } };

    if (_.isEmpty(models)) {
      return initialState;
    }

    return models.reduce((acc, name) => {
      const model = plugin ?
        strapi.plugins[plugin].models[name]:
        strapi.models[name];

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
      const _schema = _.cloneDeep(_.get(strapi.plugins, `graphql.config._schema.graphql`, {}));

      // Retrieve user customisation.
      const { _type = {} } = _schema;

      // Convert our layer Model to the GraphQL DL.
      const attributes = Object.keys(model.attributes)
        .reduce((acc, attribute) => {
          // Convert our type to the GraphQL type.
          acc[attribute] = this.convertType(model.attributes[attribute]);

          return acc;
        }, initialState);

      // Add parameters to optimize association query.
      (model.associations || [])
        .filter(association => association.type === 'collection')
        .forEach(association => {
          attributes[`${association.alias}(sort: String, limit: Int, start: Int, where: JSON)`] = attributes[association.alias];

          delete attributes[association.alias];
        })

      acc.definition += `${this.getDescription(_type[globalId], model)}type ${globalId} {${this.formatGQL(attributes, _type[globalId], model)}}\n\n`;

      Object.assign(acc.query, {
        [`${pluralize.plural(name)}(sort: String, limit: Int, start: Int, where: JSON)`]: `[${model.globalId}]`,
        [`${pluralize.singular(name)}(id: String!)`]: model.globalId
      });

      // TODO:
      // - Handle mutations.
      _.merge(acc.resolver, {
        Query : {
          [pluralize.plural(name)]: (obj, options, context) => this.composeResolver(
            obj,
            options,
            context,
            _schema,
            plugin,
            name,
            false
          ),
          [pluralize.singular(name)]: (obj, options, context) => this.composeResolver(
            obj,
            options,
            context,
            _schema,
            plugin,
            name,
            true
          )
        }
      });

      // Build associations queries.
      (model.associations || []).forEach(association => {
        if (association.nature === 'manyMorphToMany') {
          return;
        }

        if (!acc.resolver[globalId]) {
          acc.resolver[globalId] = {};
        }

        // TODO:
        // - Handle limit, skip, etc options
        _.merge(acc.resolver[globalId], {
          [association.alias]: async (obj, options, context) => {
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

              // Apply optional arguments to make more precise nested request.
              const convertedParams = strapi.utils.models.convertParams(name, this.convertToParams(options));
              const where = strapi.utils.models.convertParams(name, options.where || {});

              // Limit, order, etc.
              Object.assign(queryOpts, convertedParams);

              // Skip.
              queryOpts.skip = convertedParams.start;

              // Where.
              queryOpts.query = strapi.utils.models.convertParams(name, {
                // Construct the "where" query to only retrieve entries which are
                // related to this entry.
                [association.via]: obj[ref.primaryKey],
                ...where.where
              }).where;
            }

            const value = await (association.model ?
              resolvers.fetch(params, association.plugin):
              resolvers.fetchAll(params, queryOpts));

            return value.toJSON ? value.toJSON() : value;
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

    // Extract custom definition, query or resolver.
    const { definition, query, resolver } = strapi.plugins.graphql.config._schema.graphql;

    // Build resolvers.
    const resolvers = _.omitBy(_.merge(resolver, shadowCRUD.resolver), _.isEmpty) || {};

    // Transform object to only contain function.
    Object.keys(resolvers).reduce((acc, type) => {
      return Object.keys(acc[type]).reduce((acc, resolver) => {
        acc[type][resolver] = _.isFunction(acc[type][resolver]) ?
          acc[type][resolver]:
          acc[type][resolver].resolver;

        return acc;
      }, acc);
    }, resolvers);

    // Return empty schema when there is no model.
    if (_.isEmpty(shadowCRUD.definition) && _.isEmpty(definition)) {
      return {};
    }

    // Concatenate.
    const typeDefs =
      definition +
      shadowCRUD.definition +
      `type Query {${this.formatGQL(shadowCRUD.query, {}, null, 'query')}${query}}\n` +
      this.addCustomScalar(resolvers);

    // Build schema.
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Write schema.
    this.writeGenerateSchema(graphql.printSchema(schema));

    // Temporary variable to store the entire GraphQL configuration.
    delete strapi.plugins.graphql.config._schema.graphql;

    return schema;
  },

  /**
   * Add custom scalar type such as JSON.
   *
   * @return void
   */

  addCustomScalar: (resolvers) => {
    Object.assign(resolvers, {
      JSON: GraphQLJSON
    });

    return `scalar JSON`;
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
