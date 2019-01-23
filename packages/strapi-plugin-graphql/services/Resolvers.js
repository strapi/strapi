'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const pluralize = require('pluralize');
const Aggregator = require('./Aggregator');
const Loaders = require('./Loaders');
const Query = require('./Query.js');
const Mutation = require('./Mutation.js');
const Types = require('./Types.js');
const Schema = require('./Schema.js');

module.exports = {
  /**
   * Construct the GraphQL query & definition and apply the right resolvers.
   *
   * @return Object
   */

  shadowCRUD: function(models, plugin) {
    // Retrieve generic service from the Content Manager plugin.
    const resolvers =
      strapi.plugins['content-manager'].services['contentmanager'];

    const initialState = {
      definition: '',
      query: {},
      mutation: {},
      resolver: { Query: {}, Mutation: {} },
    };

    if (_.isEmpty(models)) {
      return initialState;
    }

    return models.reduce((acc, name) => {
      const model = plugin
        ? strapi.plugins[plugin].models[name]
        : strapi.models[name];

      // Setup initial state with default attribute that should be displayed
      // but these attributes are not properly defined in the models.
      const initialState = {
        [model.primaryKey]: 'ID!',
      };

      const globalId = model.globalId;
      const _schema = _.cloneDeep(
        _.get(strapi.plugins, 'graphql.config._schema.graphql', {}),
      );

      if (!acc.resolver[globalId]) {
        acc.resolver[globalId] = {};
      }

      // Add timestamps attributes.
      if (_.get(model, 'options.timestamps') === true) {
        Object.assign(initialState, {
          createdAt: 'DateTime!',
          updatedAt: 'DateTime!',
        });

        Object.assign(acc.resolver[globalId], {
          createdAt: (obj) => {
            // eslint-disable-line no-unused-vars
            return obj.createdAt || obj.created_at;
          },
          updatedAt: (obj) => {
            // eslint-disable-line no-unused-vars
            return obj.updatedAt || obj.updated_at;
          },
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
        .map(attribute => {
          const definition = model.attributes[attribute];

          return `enum ${Types.convertEnumType(
            definition,
            globalId,
            attribute,
          )} { ${definition.enum.join(' \n ')} }`;
        })
        .join(' ');

      acc.definition += enums;

      // Add parameters to optimize association query.
      (model.associations || [])
        .filter(association => association.type === 'collection')
        .forEach(association => {
          attributes[
            `${
              association.alias
            }(sort: String, limit: Int, start: Int, where: JSON)`
          ] = attributes[association.alias];

          delete attributes[association.alias];
        });

      acc.definition += `${Schema.getDescription(
        type[globalId],
        model,
      )}type ${globalId} {${Schema.formatGQL(
        attributes,
        type[globalId],
        model,
      )}}\n\n`;

      // Add definition to the schema but this type won't be "queriable" or "mutable".
      if (
        type[model.globalId] === false ||
        _.get(type, `${model.globalId}.enabled`) === false
      ) {
        return acc;
      }

      // Build resolvers.
      const queries = {
        singular:
          _.get(resolver, `Query.${pluralize.singular(name)}`) !== false
            ? Query.composeQueryResolver(_schema, plugin, name, true)
            : null,
        plural:
          _.get(resolver, `Query.${pluralize.plural(name)}`) !== false
            ? Query.composeQueryResolver(_schema, plugin, name, false)
            : null,
      };

      Object.keys(queries).forEach(type => {
        // The query cannot be built.
        if (_.isError(queries[type])) {
          strapi.log.error(queries[type]);
          strapi.stop();
        }

        // Only create query if the function is available.
        if (_.isFunction(queries[type])) {
          if (type === 'singular') {
            Object.assign(acc.query, {
              [`${pluralize.singular(name)}(id: ID!)`]: model.globalId,
            });
          } else {
            Object.assign(acc.query, {
              [`${pluralize.plural(
                name,
              )}(sort: String, limit: Int, start: Int, where: JSON)`]: `[${
                model.globalId
              }]`,
            });
          }

          _.merge(acc.resolver.Query, {
            [type === 'singular'
              ? pluralize.singular(name)
              : pluralize.plural(name)]: queries[type],
          });
        }
      });

      // TODO:
      // - Implement batch methods (need to update the content-manager as well).
      // - Implement nested transactional methods (create/update).
      const mutations = {
        create:
          _.get(resolver, `Mutation.create${_.capitalize(name)}`) !== false
            ? Mutation.composeMutationResolver(_schema, plugin, name, 'create')
            : null,
        update:
          _.get(resolver, `Mutation.update${_.capitalize(name)}`) !== false
            ? Mutation.composeMutationResolver(_schema, plugin, name, 'update')
            : null,
        delete:
          _.get(resolver, `Mutation.delete${_.capitalize(name)}`) !== false
            ? Mutation.composeMutationResolver(_schema, plugin, name, 'delete')
            : null,
      };

      // Add model Input definition.
      acc.definition += Types.generateInputModel(model, name);

      Object.keys(mutations).forEach(type => {
        if (_.isFunction(mutations[type])) {
          let mutationDefinition;
          let mutationName = `${type}${_.capitalize(name)}`;

          // Generate the Input for this specific action.
          acc.definition += Types.generateInputPayloadArguments(
            model,
            name,
            type,
          );

          switch (type) {
            case 'create':
              mutationDefinition = {
                [`${mutationName}(input: ${mutationName}Input)`]: `${mutationName}Payload`,
              };

              break;
            case 'update':
              mutationDefinition = {
                [`${mutationName}(input: ${mutationName}Input)`]: `${mutationName}Payload`,
              };

              break;
            case 'delete':
              mutationDefinition = {
                [`${mutationName}(input: ${mutationName}Input)`]: `${mutationName}Payload`,
              };
              break;
            default:
            // Nothing.
          }

          // Assign mutation definition to global definition.
          Object.assign(acc.mutation, mutationDefinition);

          // Assign resolver to this mutation and merge it with the others.
          _.merge(acc.resolver.Mutation, {
            [`${mutationName}`]: mutations[type],
          });
        }
      });

      // TODO:
      // - Add support for Graphql Aggregation in Bookshelf ORM
      if (model.orm === 'mongoose') {
        // Generation the aggregation for the given model
        const modelAggregator = Aggregator.formatModelConnectionsGQL(
          attributes,
          model,
          name,
          queries.plural,
        );
        if (modelAggregator) {
          acc.definition += modelAggregator.type;
          if (!acc.resolver[modelAggregator.globalId]) {
            acc.resolver[modelAggregator.globalId] = {};
          }

          _.merge(acc.resolver, modelAggregator.resolver);
          _.merge(acc.query, modelAggregator.query);
        }
      }

      // Build associations queries.
      (model.associations || []).forEach(association => {
        switch (association.nature) {
          case 'oneToManyMorph':
            return _.merge(acc.resolver[globalId], {
              [association.alias]: async obj => {
                const withRelated = await resolvers.fetch(
                  {
                    id: obj[model.primaryKey],
                    model: name,
                  },
                  plugin,
                  [association.alias],
                  false,
                );

                const entry =
                  withRelated && withRelated.toJSON
                    ? withRelated.toJSON()
                    : withRelated;

                // Set the _type only when the value is defined
                if (entry[association.alias]) {
                  entry[association.alias]._type = _.upperFirst(
                    association.model,
                  );
                }

                return entry[association.alias];
              },
            });
          case 'manyMorphToOne':
          case 'manyMorphToMany':
          case 'manyToManyMorph':
            return _.merge(acc.resolver[globalId], {
              [association.alias]: async (obj) => {
                // eslint-disable-line no-unused-vars
                const [withRelated, withoutRelated] = await Promise.all([
                  resolvers.fetch(
                    {
                      id: obj[model.primaryKey],
                      model: name,
                    },
                    plugin,
                    [association.alias],
                    false,
                  ),
                  resolvers.fetch(
                    {
                      id: obj[model.primaryKey],
                      model: name,
                    },
                    plugin,
                    [],
                  ),
                ]);

                const entry =
                  withRelated && withRelated.toJSON
                    ? withRelated.toJSON()
                    : withRelated;

                // TODO:
                // - Handle sort, limit and start (lodash or inside the query)
                entry[association.alias].map((entry, index) => {
                  const type =
                    _.get(
                      withoutRelated,
                      `${association.alias}.${index}.kind`,
                    ) ||
                    _.upperFirst(
                      _.camelCase(
                        _.get(
                          withoutRelated,
                          `${association.alias}.${index}.${
                            association.alias
                          }_type`,
                        ),
                      ),
                    ) ||
                    _.upperFirst(_.camelCase(association[association.type]));

                  entry._type = type;

                  return entry;
                });

                return entry[association.alias];
              },
            });
          default:
        }

        _.merge(acc.resolver[globalId], {
          [association.alias]: async (obj, options) => {
            // eslint-disable-line no-unused-vars
            // Construct parameters object to retrieve the correct related entries.
            const params = {
              model: association.model || association.collection,
            };

            const queryOpts = {
              source: association.plugin,
            };

            // Get refering model.
            const ref = association.plugin
              ? strapi.plugins[association.plugin].models[params.model]
              : strapi.models[params.model];

            if (association.type === 'model') {
              params[ref.primaryKey] = _.get(obj, [association.alias, ref.primaryKey], obj[association.alias]);
            } else {
              // Apply optional arguments to make more precise nested request.
              const convertedParams = strapi.utils.models.convertParams(
                name,
                Query.convertToParams(Query.amountLimiting(options)),
              );

              const where = strapi.utils.models.convertParams(
                name,
                options.where || {},
              );

              // Limit, order, etc.
              Object.assign(queryOpts, convertedParams, { where: where.where });

              // Skip.
              queryOpts.skip = convertedParams.start;

              switch (association.nature) {
                case "manyToMany": {
                  const arrayOfIds = (obj[association.alias] || []).map(
                    related => {
                      return related[ref.primaryKey] || related;
                    }
                  );
                  
                  Object.assign(queryOpts, {
                    ...queryOpts,
                    query: {
                      [ref.primaryKey]: arrayOfIds
                    }
                  });

                  break;
                }
                default:
                  Object.assign(queryOpts, {
                    ...queryOpts,
                    query: {
                      [association.via]: obj[ref.primaryKey]
                    }
                  });
              }
            }

            if (queryOpts.hasOwnProperty('query') &&
              queryOpts.query.hasOwnProperty('id') &&
              queryOpts.query.id.hasOwnProperty('value') &&
              Array.isArray(queryOpts.query.id.value)
            ) {
              queryOpts.query.id.symbol = 'IN';
            }

            const loaderName = association.plugin ? `${association.plugin}__${params.model}`: params.model;

            return association.model ?
              Loaders.loaders[loaderName].load({ params, options: queryOpts, single: true }):
              Loaders.loaders[loaderName].load({ options: queryOpts, association });
          },
        });
      });

      return acc;
    }, initialState);
  }
};
