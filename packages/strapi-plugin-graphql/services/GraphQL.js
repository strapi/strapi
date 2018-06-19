'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */


const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const pluralize = require('pluralize');
const graphql = require('graphql');
const { makeExecutableSchema } = require('graphql-tools');
const GraphQLJSON = require('graphql-type-json');
const policyUtils = require('strapi-utils').policy;

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
        .map(line => {
          if (['{', '}'].includes(line)) {
            return '';
          }

          const split = line.split(':');
          const attribute = _.trim(split[0]);
          const info = (_.isString(description[attribute]) ? description[attribute] : _.get(description[attribute], 'description')) || _.get(model, `attributes.${attribute}.description`);
          const deprecated = _.get(description[attribute], 'deprecated') || _.get(model, `attributes.${attribute}.deprecated`);

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
    } else if (type === 'query') {
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

    const str = _.get(description, '_description') ||
      _.isString(description) ? description : undefined ||
      _.get(model, 'info.description');

    if (str) {
      return `${format}${str}\n${format}`;
    }

    return '';
  },

  convertToParams: (params) => {
    return Object.keys(params).reduce((acc, current) => {
      return Object.assign(acc, {
        [`_${current}`]: params[current]
      });
    }, {});
  },

  /**
   * Security to avoid infinite limit.
   *
   * @return String
   */

  amountLimiting: (params) => {
    if (params.limit && params.limit < 0) {
      params.limit = 0;
    } else if (params.limit && params.limit > 100) {
      params.limit = 100;
    }

    return params;
  },

  /**
   * Convert Strapi type to GraphQL type.
   * @param {Object} attribute Information about the attribute.
   * @param {Object} attribute.definition Definition of the attribute.
   * @param {String} attribute.modelName Name of the model which owns the attribute.
   * @param {String} attribute.attributeName Name of the attribute.
   * @return String
   */

  convertType: function ({ definition = {}, modelName = '', attributeName = '' }) {
    // Type
    if (definition.type) {
      let type = 'String';

      switch (definition.type) {
        // TODO: Handle fields of type Array, Perhaps default to [Int] or [String] ...
        case 'boolean':
          type = 'Boolean';
          break;
        case 'integer':
          type = 'Int';
          break;
        case 'float':
          type = 'Float';
          break;
        case 'enumeration':
          type = this.convertEnumType(definition, modelName, attributeName);
          break;
      }

      if (definition.required) {
        type += '!';
      }

      return type;
    }

    const ref = definition.model || definition.collection;

    // Association
    if (ref && ref !== '*') {
      // Add bracket or not
      const globalId = definition.plugin ?
        strapi.plugins[definition.plugin].models[ref].globalId:
        strapi.models[ref].globalId;
      const plural = !_.isEmpty(definition.collection);

      if (plural) {
        return `[${globalId}]`;
      }

      return globalId;
    }

    return definition.model ? 'Morph' : '[Morph]';
  },

  /**
   * Convert Strapi enumeration to GraphQL Enum.
   * @param {Object} definition Definition of the attribute.
   * @param {String} model Name of the model which owns the attribute.
   * @param {String} field Name of the attribute.
   * @return String
   */
  
  convertEnumType: (definition, model, field) => definition.enumName ? definition.enumName : `ENUM_${model.toUpperCase()}_${field.toUpperCase()}`,

  /**
   * Execute policies before the specified resolver.
   *
   * @return Promise or Error.
   */

  composeResolver: function (_schema, plugin, name, isSingular) {
    const params = {
      model: name
    };

    const queryOpts = plugin ? { source: plugin } : {}; // eslint-disable-line no-unused-vars

    const model = plugin ?
      strapi.plugins[plugin].models[name]:
      strapi.models[name];

    // Retrieve generic service from the Content Manager plugin.
    const resolvers = strapi.plugins['content-manager'].services['contentmanager']; // eslint-disable-line no-unused-vars

    // Extract custom resolver or type description.
    const { resolver: handler = {} } = _schema;

    let queryName;

    if (isSingular === 'force') {
      queryName = name;
    } else {
      queryName = isSingular ?
        pluralize.singular(name):
        pluralize.plural(name);
    }

    // Retrieve policies.
    const policies = _.get(handler, `Query.${queryName}.policies`, []);

    // Retrieve resolverOf.
    const resolverOf = _.get(handler, `Query.${queryName}.resolverOf`, '');

    const policiesFn = [];

    // Boolean to define if the resolver is going to be a resolver or not.
    let isController = false;

    // Retrieve resolver. It could be the custom resolver of the user
    // or the shadow CRUD resolver (aka Content-Manager).
    const resolver = (() => {
      // Try to retrieve custom resolver.
      const resolver = _.get(handler, `Query.${queryName}.resolver`);

      if (_.isString(resolver) || _.isPlainObject(resolver)) {
        const { handler = resolver } = _.isPlainObject(resolver) ? resolver : {};

        // Retrieve the controller's action to be executed.
        const [ name, action ] = handler.split('.');

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

        // Return the controller.
        return controller;
      } else if (resolver) {
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
            [model.primaryKey]: ctx.params.id
          };

          // Return the controller.
          return controller(ctx, next);
        };
      }

      // Plural.
      return async (ctx, next) => {
        ctx.params = this.amountLimiting(ctx.params);
        ctx.query = Object.assign(
          this.convertToParams(_.omit(ctx.params, 'where')),
          ctx.params.where
        );

        return controller(ctx, next);
      };
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

    return async (obj, options, context) => {
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
        context.query = this.convertToParams(options);
        context.params = this.amountLimiting(options);

        if (isController) {
          const values = await resolver.call(null, context);

          if (ctx.body) {
            return ctx.body;
          }

          return values && values.toJSON ? values.toJSON() : values;
        }


        return resolver.call(null, obj, options, context);
      }

      // Resolver can be a promise.
      return resolver;
    };
  },

  /**
   * Construct the GraphQL query & definition and apply the right resolvers.
   *
   * @return Object
   */

  shadowCRUD: function (models, plugin) {
    // Retrieve generic service from the Content Manager plugin.
    const resolvers = strapi.plugins['content-manager'].services['contentmanager'];

    const initialState = { definition: '', query: {}, resolver: { Query : {} } };

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
        [model.primaryKey]: 'ID!'
      };

      const globalId = model.globalId;
      const _schema = _.cloneDeep(_.get(strapi.plugins, 'graphql.config._schema.graphql', {}));

      if (!acc.resolver[globalId]) {
        acc.resolver[globalId] = {};
      }

      // Add timestamps attributes.
      if (_.get(model, 'options.timestamps') === true) {
        Object.assign(initialState, {
          createdAt: 'String!',
          updatedAt: 'String!'
        });

        Object.assign(acc.resolver[globalId], {
          createdAt: (obj, options, context) => { // eslint-disable-line no-unused-vars
            return obj.createdAt || obj.created_at;
          },
          updatedAt: (obj, options, context) => { // eslint-disable-line no-unused-vars
            return obj.updatedAt || obj.updated_at;
          }
        });
      }

      // Retrieve user customisation.
      const { type = {}, resolver = {} } = _schema;

      // Convert our layer Model to the GraphQL DL.
      const attributes = Object.keys(model.attributes)
        .filter(attribute => model.attributes[attribute].private !== true)
        .reduce((acc, attribute) => {
          // Convert our type to the GraphQL type.
          acc[attribute] = this.convertType({
            definition: model.attributes[attribute],
            modelName: globalId,
            attributeName: attribute,
          });

          return acc;
        }, initialState);

      // Detect enum and generate it for the schema definition
      const enums = Object.keys(model.attributes)
        .filter(attribute => model.attributes[attribute].type === 'enumeration')
        .map((attribute) => {
          const definition = model.attributes[attribute];

          return `enum ${this.convertEnumType(definition, globalId, attribute)} { ${definition.enum.join(' \n ')} }`;
        }).join(' ');

      acc.definition += enums;

      // Add parameters to optimize association query.
      (model.associations || [])
        .filter(association => association.type === 'collection')
        .forEach(association => {
          attributes[`${association.alias}(sort: String, limit: Int, start: Int, where: JSON)`] = attributes[association.alias];

          delete attributes[association.alias];
        });

      acc.definition += `${this.getDescription(type[globalId], model)}type ${globalId} {${this.formatGQL(attributes, type[globalId], model)}}\n\n`;

      // Add definition to the schema but this type won't be "queriable".
      if (type[model.globalId] === false || _.get(type, `${model.globalId}.enabled`) === false) {
        return acc;
      }

      // Build resolvers.
      const queries = {
        singular: _.get(resolver, `Query.${pluralize.singular(name)}`) !== false ? this.composeResolver(
          _schema,
          plugin,
          name,
          true
        ) : null,
        plural: _.get(resolver, `Query.${pluralize.plural(name)}`) !== false ? this.composeResolver(
          _schema,
          plugin,
          name,
          false
        ) : null
      };

      // TODO:
      // - Handle mutations.
      Object.keys(queries).forEach(type => {
        // The query cannot be built.
        if (_.isError(queries[type])) {
          console.error(queries[type]);
          strapi.stop();
        }

        // Only create query if the function is available.
        if (_.isFunction(queries[type])) {
          if (type === 'singular') {
            Object.assign(acc.query, {
              [`${pluralize.singular(name)}(id: ID!)`]: model.globalId
            });
          } else {
            Object.assign(acc.query, {
              [`${pluralize.plural(name)}(sort: String, limit: Int, start: Int, where: JSON)`]: `[${model.globalId}]`
            });
          }

          _.merge(acc.resolver.Query, {
            [type === 'singular' ? pluralize.singular(name) : pluralize.plural(name)]: queries[type]
          });
        }
      });

      // Build associations queries.
      (model.associations || []).forEach(association => {
        switch (association.nature) {
          case 'oneToManyMorph':
            return _.merge(acc.resolver[globalId], {
              [association.alias]: async (obj) => {
                const withRelated = await resolvers.fetch({
                  id: obj[model.primaryKey],
                  model: name
                }, plugin, [association.alias], false);

                const entry = withRelated && withRelated.toJSON ? withRelated.toJSON() : withRelated;

                // Set the _type only when the value is defined
                if (entry[association.alias]) {
                  entry[association.alias]._type = _.upperFirst(association.model);
                }

                return entry[association.alias];
              }
            });
          case 'manyMorphToOne':
          case 'manyMorphToMany':
          case 'manyToManyMorph':
            return _.merge(acc.resolver[globalId], {
              [association.alias]: async (obj, options, context) => { // eslint-disable-line no-unused-vars
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

                const entry = withRelated && withRelated.toJSON ? withRelated.toJSON() : withRelated;

                // TODO:
                // - Handle sort, limit and start (lodash or inside the query)
                entry[association.alias].map((entry, index) => {
                  const type = _.get(withoutRelated, `${association.alias}.${index}.kind`) ||
                  _.upperFirst(_.camelCase(_.get(withoutRelated, `${association.alias}.${index}.${association.alias}_type`))) ||
                  _.upperFirst(_.camelCase(association[association.type]));

                  entry._type = type;

                  return entry;
                });

                return entry[association.alias];
              }
            });
          default:
        }

        _.merge(acc.resolver[globalId], {
          [association.alias]: async (obj, options, context) => { // eslint-disable-line no-unused-vars
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
              // Get refering model.
              const ref = association.plugin ?
                strapi.plugins[association.plugin].models[params.model]:
                strapi.models[params.model];

              // Apply optional arguments to make more precise nested request.
              const convertedParams = strapi.utils.models.convertParams(name, this.convertToParams(this.amountLimiting(options)));
              const where = strapi.utils.models.convertParams(name, options.where || {});

              // Limit, order, etc.
              Object.assign(queryOpts, convertedParams);

              // Skip.
              queryOpts.skip = convertedParams.start;

              switch (association.nature) {
                case 'manyToMany': {
                  if (association.dominant) {
                    const arrayOfIds = (obj[association.alias] || []).map(related => {
                      return related[ref.primaryKey] || related;
                    });

                    // Where.
                    queryOpts.query = strapi.utils.models.convertParams(name, {
                      // Construct the "where" query to only retrieve entries which are
                      // related to this entry.
                      [ref.primaryKey]: arrayOfIds,
                      ...where.where
                    }).where;
                    break;
                  }
                  // falls through
                }
                default:
                  // Where.
                  queryOpts.query = strapi.utils.models.convertParams(name, {
                    // Construct the "where" query to only retrieve entries which are
                    // related to this entry.
                    [association.via]: obj[ref.primaryKey],
                    ...where.where
                  }).where;
              }
            }

            const value = await (association.model ?
              resolvers.fetch(params, association.plugin, []):
              resolvers.fetchAll(params, { ...queryOpts, populate: [] }));

            return value && value.toJSON ? value.toJSON() : value;
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
        acc.definition += definition || '';

        return _.merge(acc, {
          query,
          resolver
        });
      }, this.shadowCRUD(models));
    })() : { definition: '', query: '', resolver: '' };

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

        if (!_.isFunction(acc[type][resolver])) {
          acc[type][resolver] = acc[type][resolver].resolver;
        }

        if (_.isString(acc[type][resolver]) || _.isPlainObject(acc[type][resolver])) {
          const { plugin = '' } = _.isPlainObject(acc[type][resolver]) ? acc[type][resolver] : {};

          acc[type][resolver] = this.composeResolver(
            strapi.plugins.graphql.config._schema.graphql,
            plugin,
            resolver,
            'force' // Avoid singular/pluralize and force query name.
          );
        }

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
      type Query {${shadowCRUD.query && this.formatGQL(shadowCRUD.query, resolver.Query, null, 'query')}${query}}
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

    return 'scalar JSON';
  },

  /**
   * Add Union Type that contains the types defined by the user.
   *
   * @return string
   */

  addPolymorphicUnionType: (customDefs, defs) => {
    const types = graphql.parse(customDefs + defs).definitions
      .filter(def => def.kind === 'ObjectTypeDefinition' && def.name.value !== 'Query')
      .map(def => def.name.value);

    if (types.length > 0) {
      return {
        polymorphicDef: `union Morph = ${types.join(' | ')}`,
        polymorphicResolver: {
          Morph: {
            __resolveType(obj, context, info) { // eslint-disable-line no-unused-vars
              return obj.kind || obj._type;
            }
          }
        }
      };
    }

    return {
      polymorphicDef: '',
      polymorphicResolver: {}
    };
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
