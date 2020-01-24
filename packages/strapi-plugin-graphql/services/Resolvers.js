'use strict';

/**
 * GraphQL.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');

const DynamicZoneScalar = require('../types/dynamiczoneScalar');

const Aggregator = require('./Aggregator');
const Query = require('./Query.js');
const Mutation = require('./Mutation.js');
const Types = require('./Types.js');
const Schema = require('./Schema.js');
const { toSingular, toPlural } = require('./naming');

/**
 * Merges
 */
const mergeSubSchema = (root, ...subs) => {
  subs.forEach(sub => {
    const { definition = '', query = {}, mutation = {}, resolvers = {} } = sub;

    root.definition += '\n' + definition;
    _.merge(root, {
      query,
      mutation,
      resolvers,
    });
  });
};

const convertAttributes = (attributes, globalId) => {
  return Object.keys(attributes)
    .filter(attribute => attributes[attribute].private !== true)
    .reduce((acc, attribute) => {
      // Convert our type to the GraphQL type.
      acc[attribute] = Types.convertType({
        definition: attributes[attribute],
        modelName: globalId,
        attributeName: attribute,
      });
      return acc;
    }, {});
};

const generateEnumDefinitions = (attributes, globalId) => {
  return Object.keys(attributes)
    .filter(attribute => attributes[attribute].type === 'enumeration')
    .map(attribute => {
      const definition = attributes[attribute];

      const name = Types.convertEnumType(definition, globalId, attribute);
      const values = definition.enum.map(v => `\t${v}`).join('\n');
      return `enum ${name} {\n${values}\n}\n`;
    })
    .join('');
};

const generateDynamicZoneDefinitions = (attributes, globalId, schema) => {
  Object.keys(attributes)
    .filter(attribute => attributes[attribute].type === 'dynamiczone')
    .forEach(attribute => {
      const { components } = attributes[attribute];

      const typeName = `${globalId}${_.upperFirst(
        _.camelCase(attribute)
      )}DynamicZone`;

      if (components.length === 0) {
        // Create dummy type because graphql doesn't support empty ones

        schema.definition += `type ${typeName} { _:Boolean}`;
        schema.definition += `\nscalar EmptyQuery\n`;
      } else {
        const componentsTypeNames = components.map(componentUID => {
          const compo = strapi.components[componentUID];
          if (!compo) {
            throw new Error(
              `Trying to creating dynamiczone type with unkown component ${componentUID}`
            );
          }

          return compo.globalId;
        });

        const unionType = `union ${typeName} = ${componentsTypeNames.join(
          ' | '
        )}`;

        schema.definition += `\n${unionType}\n`;
      }

      const inputTypeName = `${typeName}Input`;
      schema.definition += `\nscalar ${inputTypeName}\n`;

      schema.resolvers[typeName] = {
        __resolveType(obj) {
          return strapi.components[obj.__component].globalId;
        },
      };

      schema.resolvers[inputTypeName] = new DynamicZoneScalar({
        name: inputTypeName,
        attribute,
        globalId,
        components,
      });
    });
};

const mutateAssocAttributes = (associations = [], attributes) => {
  associations
    .filter(association => association.type === 'collection')
    .forEach(association => {
      attributes[
        `${association.alias}(sort: String, limit: Int, start: Int, where: JSON)`
      ] = attributes[association.alias];

      delete attributes[association.alias];
    });
};

const buildAssocResolvers = model => {
  const contentManager =
    strapi.plugins['content-manager'].services['contentmanager'];

  const { primaryKey, associations = [] } = model;

  return associations
    .filter(association => model.attributes[association.alias].private !== true)
    .reduce((resolver, association) => {
      const target = association.model || association.collection;
      const targetModel = strapi.getModel(target, association.plugin);

      switch (association.nature) {
        case 'oneToManyMorph':
        case 'manyMorphToOne':
        case 'manyMorphToMany':
        case 'manyToManyMorph': {
          resolver[association.alias] = async obj => {
            if (obj[association.alias]) {
              return obj[association.alias];
            }

            const entry = await contentManager.fetch(
              {
                id: obj[primaryKey],
                model: model.uid,
              },
              [association.alias]
            );

            return entry[association.alias];
          };
          break;
        }
        default: {
          resolver[association.alias] = async (obj, options) => {
            // Construct parameters object to retrieve the correct related entries.
            const params = {
              model: targetModel.uid,
            };

            let queryOpts = {};

            if (association.type === 'model') {
              params[targetModel.primaryKey] = _.get(
                obj,
                [association.alias, targetModel.primaryKey],
                obj[association.alias]
              );
            } else {
              const queryParams = Query.amountLimiting(options);
              queryOpts = {
                ...queryOpts,
                ...Query.convertToParams(_.omit(queryParams, 'where')), // Convert filters (sort, limit and start/skip)
                ...Query.convertToQuery(queryParams.where),
              };

              if (
                ((association.nature === 'manyToMany' &&
                  association.dominant) ||
                  association.nature === 'manyWay') &&
                _.has(obj, association.alias) // if populated
              ) {
                _.set(
                  queryOpts,
                  ['query', targetModel.primaryKey],
                  obj[association.alias]
                    ? obj[association.alias]
                        .map(val => val[targetModel.primaryKey] || val)
                        .sort()
                    : []
                );
              } else {
                _.set(
                  queryOpts,
                  ['query', association.via],
                  obj[targetModel.primaryKey]
                );
              }
            }

            return association.model
              ? strapi.plugins.graphql.services.loaders.loaders[
                  targetModel.uid
                ].load({
                  params,
                  options: queryOpts,
                  single: true,
                })
              : strapi.plugins.graphql.services.loaders.loaders[
                  targetModel.uid
                ].load({
                  options: queryOpts,
                  association,
                });
          };
          break;
        }
      }

      return resolver;
    }, {});
};

const buildModel = (model, { schema, isComponent = false } = {}) => {
  const { globalId, primaryKey } = model;

  schema.resolvers[globalId] = {
    id: obj => obj[primaryKey],
    ...buildAssocResolvers(model),
  };

  const initialState = {
    id: 'ID!',
    [primaryKey]: 'ID!',
  };

  if (_.isArray(_.get(model, 'options.timestamps'))) {
    const [createdAtKey, updatedAtKey] = model.options.timestamps;
    initialState[createdAtKey] = 'DateTime!';
    initialState[updatedAtKey] = 'DateTime!';
  }

  const attributes = convertAttributes(model.attributes, globalId);
  mutateAssocAttributes(model.associations, attributes);
  _.merge(attributes, initialState);

  schema.definition += generateEnumDefinitions(model.attributes, globalId);
  generateDynamicZoneDefinitions(model.attributes, globalId, schema);

  const description = Schema.getDescription({}, model);
  const fields = Schema.formatGQL(attributes, {}, model);
  const typeDef = `${description}type ${globalId} {${fields}}\n`;

  schema.definition += typeDef;
  schema.definition += Types.generateInputModel(model, globalId, {
    allowIds: isComponent,
  });
};

/**
 * Construct the GraphQL query & definition and apply the right resolvers.
 *
 * @return Object
 */

const buildShadowCRUD = models => {
  const schema = {
    definition: '',
    query: {},
    mutation: {},
    resolvers: { Query: {}, Mutation: {} },
  };

  if (_.isEmpty(models)) {
    return schema;
  }

  const subSchemas = Object.values(models).map(model => {
    const { kind } = model;

    switch (kind) {
      case 'singleType': {
        // const type = buildSingleType(model);
        // mergeSubSchema(type, schema);
        break;
      }
      default:
        return buildCollectionType(model);
    }
  });

  mergeSubSchema(schema, ...subSchemas);

  return schema;
};

const buildCollectionType = model => {
  const { globalId, primaryKey, plugin, modelName } = model;

  const singularName = toSingular(modelName);
  const pluralName = toPlural(modelName);

  const _schema = _.cloneDeep(
    _.get(strapi.plugins, 'graphql.config._schema.graphql', {})
  );

  const { type = {}, resolver = {} } = _schema;

  const localSchema = {
    definition: '',
    query: {},
    mutation: {},
    resolvers: { Query: {}, Mutation: {} },
  };

  // Setup initial state with default attribute that should be displayed
  // but these attributes are not properly defined in the models.
  const initialState = {
    [primaryKey]: 'ID!',
    id: 'ID!',
  };

  localSchema.resolvers[globalId] = {
    // define the default id resolver
    id(parent) {
      return parent[model.primaryKey] || parent.id;
    },
  };

  // Add timestamps attributes.
  if (_.isArray(_.get(model, 'options.timestamps'))) {
    const [createdAtKey, updatedAtKey] = model.options.timestamps;
    initialState[createdAtKey] = 'DateTime!';
    initialState[updatedAtKey] = 'DateTime!';
  }

  // Convert our layer Model to the GraphQL DL.
  const attributes = convertAttributes(model.attributes, globalId);
  mutateAssocAttributes(model.associations, attributes);
  _.merge(attributes, initialState);

  localSchema.definition += generateEnumDefinitions(model.attributes, globalId);
  generateDynamicZoneDefinitions(model.attributes, globalId, localSchema);

  const description = Schema.getDescription(type[globalId], model);
  const fields = Schema.formatGQL(attributes, type[globalId], model);
  const typeDef = `${description}type ${globalId} {${fields}}\n`;

  localSchema.definition += typeDef;

  // Add definition to the schema but this type won't be "queriable" or "mutable".
  if (
    type[model.globalId] === false ||
    _.get(type, `${model.globalId}.enabled`) === false
  ) {
    return localSchema;
  }

  const buildFindOneQuery = () => {
    return _.get(resolver, `Query.${singularName}`) !== false
      ? Query.composeQueryResolver({
          _schema,
          plugin,
          name: modelName,
          isSingular: true,
        })
      : null;
  };

  const buildFindQuery = () => {
    return _.get(resolver, `Query.${pluralName}`) !== false
      ? Query.composeQueryResolver({
          _schema,
          plugin,
          name: modelName,
          isSingular: false,
        })
      : null;
  };

  // Build resolvers.
  const queries = {
    singular: buildFindOneQuery(),
    plural: buildFindQuery(),
  };

  if (_.isFunction(queries.singular)) {
    _.merge(localSchema, {
      query: {
        [`${singularName}(id: ID!)`]: model.globalId,
      },
      resolvers: {
        Query: {
          [singularName]: queries.singular,
        },
      },
    });
  }

  if (_.isFunction(queries.plural)) {
    _.merge(localSchema, {
      query: {
        [`${pluralName}(sort: String, limit: Int, start: Int, where: JSON)`]: `[${model.globalId}]`,
      },
      resolvers: {
        Query: {
          [pluralName]: queries.plural,
        },
      },
    });
  }

  // Add model Input definition.
  localSchema.definition += Types.generateInputModel(model, modelName);

  // build every mutation
  ['create', 'update', 'delete'].forEach(action => {
    const mutationScheam = buildMutation({ model, action }, { _schema });

    mergeSubSchema(localSchema, mutationScheam);
  });

  // TODO: Add support for Graphql Aggregation in Bookshelf ORM
  if (model.orm === 'mongoose') {
    // Generation the aggregation for the given model
    const modelAggregator = Aggregator.formatModelConnectionsGQL(
      attributes,
      model,
      modelName,
      queries.plural,
      plugin
    );

    if (modelAggregator) {
      localSchema.definition += modelAggregator.type;
      if (!localSchema.resolvers[modelAggregator.globalId]) {
        localSchema.resolvers[modelAggregator.globalId] = {};
      }

      _.merge(localSchema.resolvers, modelAggregator.resolver);
      _.merge(localSchema.query, modelAggregator.query);
    }
  }

  // Build associations queries.
  _.assign(localSchema.resolvers[globalId], buildAssocResolvers(model));
  return localSchema;
};

// TODO:
// - Implement batch methods (need to update the content-manager as well).
// - Implement nested transactional methods (create/update).
const buildMutation = ({ model, action }, { _schema }) => {
  const capitalizedName = _.upperFirst(toSingular(model.modelName));
  const mutationName = `${action}${capitalizedName}`;

  const definition = Types.generateInputPayloadArguments({
    model,
    name: model.modelName,
    mutationName,
    action,
  });

  // ignore if disabled
  if (_.get(_schema, ['resolver', 'Mutation', mutationName]) === false) {
    return {
      definition,
    };
  }

  const mutationResolver = Mutation.composeMutationResolver({
    _schema,
    plugin: model.plugin,
    name: model.modelName,
    action,
  });

  return {
    definition,
    mutation: {
      [`${mutationName}(input: ${mutationName}Input)`]: `${mutationName}Payload`,
    },
    resolvers: {
      Mutation: {
        [mutationName]: mutationResolver,
      },
    },
  };
};

module.exports = {
  buildShadowCRUD,
  buildModel,
};
