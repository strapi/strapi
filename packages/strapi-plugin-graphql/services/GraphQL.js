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
          if (['{', '}'].includes(line)) {
            return ``;
          }

          const split = line.split(':');
          const attribute = _.trim(split[0]);
          const info = (_.isString(description[attribute]) ? description[attribute] : _.get(description[attribute], 'description')) || _.get(model, `attributes.${attribute}.description`);
          const deprecated = _.get(description[attribute], 'deprecated') || _.get(model, `attributes.${attribute}.deprecated`);

          if (info) {
            line = `  """\n    ${info}\n  """\n${line}`;
          }

          if (deprecated) {
            line = `${line} @deprecated(reason: "${deprecated}")`;
          }

          return line;
        })
        .join('\n');
    } else if (type === 'query') {
      return lines
        .map((line, index) => {
          if (['{', '}'].includes(line)) {
            return ``;
          }

          const split = Object.keys(fields)[index - 1].split('(');
          const attribute = _.trim(split[0]);
          const info = _.get(description[attribute], 'description');
          const deprecated = _.get(description[attribute], 'deprecated');

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
      _.get(model, 'info.description');

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

  convertType: (definition = {}) => {
    // Type.
    if (definition.type) {
      switch (definition.type) {
        case 'string':
        case 'text':
          return 'String';
        case 'boolean':
          return 'Boolean';
        case 'integer':
          return 'Int';
        case 'float':
          return 'Float';
        default:
          return 'String';
      }
    }

    const ref = definition.model || definition.collection;

    // Association.
    if (ref && ref !== '*') {
      // Add bracket or not.
      const globalId = definition.plugin ?
        strapi.plugins[definition.plugin].models[ref].globalId:
        strapi.models[definition.plugin].globalId;
      const plural = !_.isEmpty(definition.collection);

      if (plural) {
        return `[${globalId}]`;
      }

      return globalId;
    }

    return definition.model ? `Morph` : `[Morph]`;
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

    const model = plugin ?
      strapi.plugins[plugin].models[name]:
      strapi.models[name];

    // Retrieve generic service from the Content Manager plugin.
    const resolvers = strapi.plugins['content-manager'].services['contentmanager'];

    // Extract custom resolver or type description.
    const { resolver: handler = {} } = _schema;

    const queryName = isSingular ?
      pluralize.singular(name):
      pluralize.plural(name);

    // Retrieve policies.
    const policies = isSingular ?
      _.get(handler, `Query.${pluralize.singular(name)}.policies`, []):
      _.get(handler, `Query.${pluralize.plural(name)}.policies`, []);

    // Retrieve resolverOf.
    const resolverOf = isSingular ?
      _.get(handler, `Query.${pluralize.singular(name)}.resolverOf`, ''):
      _.get(handler, `Query.${pluralize.plural(name)}.resolverOf`, '');

    const policiesFn = [];

    // Boolean to define if the resolver is going to be a resolver or not.
    let isController = false;

    // Retrieve resolver. It could be the custom resolver of the user
    // or the shadow CRUD resolver (aka Content-Manager).
    const resolver = (() => {
      // Try to retrieve custom resolver.
      const resolver = isSingular ?
        _.get(handler, `Query.${pluralize.singular(name)}.resolver`):
        _.get(handler, `Query.${pluralize.plural(name)}.resolver`);

      if (_.isString(resolver)) {
        // Retrieve the controller's action to be executed.
        const [ name, action ] = resolver.split('.');

        const controller = plugin ?
          _.get(strapi.plugins, `${plugin}.controllers.${_.toLower(name)}.${action}`):
          _.get(strapi.controllers, `${_.toLower(name)}.${action}`);

        if (!controller) {
          return new Error(`Cannot find the controller's action ${name}.${action}`);
        }

        // We're going to return a controller instead.
        isController = true;

        // Push global policy to make sure the permissions will work as expected.
        policiesFn.push(
          policyUtils.globalPolicy(undefined, {
            handler: `${name}.${action}`
          }, undefined, plugin)
        );

        return async (ctx, next) => {
          ctx.query = this.convertToParams(options);
          ctx.params = options;

          // Return the controller.
          return controller(ctx, next);
        }
      } else if (resolver) {
        context.query = this.convertToParams(options);
        context.params = options;

        // Function.
        return resolver;
      }

      // We're going to return a controller instead.
      isController = true;

      const controllers = plugin ? strapi.plugins[plugin].controllers : strapi.controllers;

      // Try to find the controller that should be related to this model.
      const controller = isSingular ?
        _.get(controllers, `${name}.findOne`):
        _.get(controllers, `${name}.find`);

      if (!controller) {
        return new Error(`Cannot find the controller's action ${name}.${isSingular ? 'findOne' : 'find'}`);
      }

      // Push global policy to make sure the permissions will work as expected.
      // We're trying to detect the controller name.
      policiesFn.push(
        policyUtils.globalPolicy(undefined, {
          handler: `${name}.${isSingular ? 'findOne' : 'find'}`
        }, undefined, plugin)
      );

      // Make the query compatible with our controller by
      // setting in the context the parameters.
      if (isSingular) {
        return async (ctx, next) => {
          ctx.params = {
            ...params,
            [model.primaryKey]: options.id
          };

          // Return the controller.
          return controller(ctx, next);
        }
      }

      // Plural.
      return async (ctx, next) => {
        ctx.query = this.convertToParams(options);
        // console.log(strapi.utils.models.convertParams(name, options.where || {}));

        return controller(ctx, next);
      }
    })();

    // The controller hasn't been found.
    if (_.isError(resolver)) {
      return resolver;
    }

    // Force policies of another action on a custom resolver.
    if (_.isString(resolverOf) && !_.isEmpty(resolverOf)) {
      // Retrieve the controller's action to be executed.
      const [ name, action ] = resolverOf.split('.');

      const controller = plugin ?
        _.get(strapi.plugins, `${plugin}.controllers.${_.toLower(name)}.${action}`):
        _.get(strapi.controllers, `${_.toLower(name)}.${action}`);

      if (!controller) {
        return new Error(`Cannot find the controller's action ${name}.${action}`);
      }

      policiesFn[0] = policyUtils.globalPolicy(undefined, {
        handler: `${name}.${action}`
      }, undefined, plugin);
    }

    if (strapi.plugins['users-permissions']) {
      policies.push('plugins.users-permissions.permissions');
    }

    // Populate policies.
    policies.forEach(policy => policyUtils.get(policy, plugin, policiesFn, `GraphQL query "${queryName}"`, name));

    // Hack to be able to handle permissions for each query.
    const ctx = Object.assign(_.clone(context), {
      request: Object.assign(_.clone(context.request), {
        graphql: null
      })
    });

    // Execute policies stack.
    const policy = await strapi.koaMiddlewares.compose(policiesFn)(ctx);

    // Policy doesn't always return errors but they update the current context.
    if (_.isError(ctx.request.graphql) || _.get(ctx.request.graphql, 'isBoom')) {
      return ctx.request.graphql;
    }

    // Something went wrong in the policy.
    if (policy) {
      return policy;
    }

    // Resolver can be a function. Be also a native resolver or a controller's action.
    if (_.isFunction(resolver)) {
      if (isController) {
        const values = await resolver.call(null, context);

        if (ctx.body) {
          return ctx.body;
        }

        return values;
      }

      return resolver.call(null, obj, options, context);
    }

    // Resolver can be a promise.
    return resolver;
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
      const { type = {} } = _schema;

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

      acc.definition += `${this.getDescription(type[globalId], model)}type ${globalId} {${this.formatGQL(attributes, type[globalId], model)}}\n\n`;

      // Add definition to the schema but this type won't be "queriable".
      if (type[model.globalId] === false || _.get(type, `${model.globalId}.enabled`) === false) {
        return acc;
      }

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
        if (!acc.resolver[globalId]) {
          acc.resolver[globalId] = {};
        }

        if (association.nature === 'manyMorphToMany') {
          return _.merge(acc.resolver[globalId], {
            [association.alias]: async (obj, options, context) => {
              const [ withRelated, withoutRelated ] = await Promise.all([
                resolvers.fetch({
                  id: obj[model.primaryKey],
                  model: name
                }, plugin, [association.alias], false),
                resolvers.fetch({
                  id: obj[model.primaryKey],
                  model: name
                }, plugin, [])
              ]);

              const entry = withRelated.toJSON ? withRelated.toJSON() : withRelated;

              entry[association.alias].map((entry, index) => {
                entry._type = withoutRelated[association.alias][index].kind;

                return entry;
              });

              return entry[association.alias];
            }
          });
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
              resolvers.fetch(params, association.plugin, []):
              resolvers.fetchAll(params, { ...queryOpts, populate: [] }));

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
    const { definition, query, resolver = {} } = strapi.plugins.graphql.config._schema.graphql;

    // Polymorphic.
    const { polymorphicDef, polymorphicResolver } = this.addPolymorphicUnionType(definition, shadowCRUD.definition);

    // Build resolvers.
    const resolvers = _.omitBy(_.merge(shadowCRUD.resolver, resolver, polymorphicResolver), _.isEmpty) || {};

    // Transform object to only contain function.
    Object.keys(resolvers).reduce((acc, type) => {
      return Object.keys(acc[type]).reduce((acc, resolver) => {
        // Disabled this query.
        if (acc[type][resolver] === false) {
          delete acc[type][resolver];

          return acc;
        }

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
    const typeDefs = `
      ${definition}
      ${shadowCRUD.definition}
      type Query {${this.formatGQL(shadowCRUD.query, resolver.Query, null, 'query')}${query}}
      ${this.addCustomScalar(resolvers)}
      ${polymorphicDef}
    `;

    // Build schema.
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Write schema.
    this.writeGenerateSchema(graphql.printSchema(schema));

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
   * Add Union Type that contains the types defined by the user.
   *
   * @return string
   */

  addPolymorphicUnionType: (customDefs, defs) => {
    const types = graphql.parse(customDefs + defs).definitions
      .filter(def => def.name.value !== 'Query')
      .map(def => def.name.value);

    return {
      polymorphicDef: `union Morph = ${types.join(' | ')}`,
      polymorphicResolver: {
        Morph: {
          __resolveType(obj, context, info){
            return obj.kind || obj._type;
          }
        }
      }
    }
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
