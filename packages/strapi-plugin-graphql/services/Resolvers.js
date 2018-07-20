'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const pluralize = require('pluralize');
const policyUtils = require('strapi-utils').policy;
const Types = require('./Types.js');
const Schema = require('./Schema.js');

module.exports = {

  /**
   * Convert parameters to valid filters parameters.
   *
   * @return Object
   */

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

    const initialState = { definition: '', query: {}, mutation: {}, resolver: { Query : {}, Mutation: {} } };

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
          createdAt: 'DateTime!',
          updatedAt: 'DateTime!'
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
          acc[attribute] = Types.convertType({
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

          return `enum ${Types.convertEnumType(definition, globalId, attribute)} { ${definition.enum.join(' \n ')} }`;
        }).join(' ');

      acc.definition += enums;

      // Add parameters to optimize association query.
      (model.associations || [])
        .filter(association => association.type === 'collection')
        .forEach(association => {
          attributes[`${association.alias}(sort: String, limit: Int, start: Int, where: JSON)`] = attributes[association.alias];

          delete attributes[association.alias];
        });

      acc.definition += `${Schema.getDescription(type[globalId], model)}type ${globalId} {${Schema.formatGQL(attributes, type[globalId], model)}}\n\n`;

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

      const mutations = {
        create: () => {
          console.log('create');
        },
        update: () => {
          console.log('update');
        },
        delete: () => {
          console.log('delete');
        }
      };

      Object.keys(mutations).forEach(type => {
        Object.assign(acc.mutation, {
          [`${type}${_.capitalize(name)}(value: String)`]: model.globalId
        });

        _.merge(acc.resolver.Mutation, {
          [`${type}${_.capitalize(name)}`]: mutations[type]
        });
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
                  }
                  break;
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
  }
};
