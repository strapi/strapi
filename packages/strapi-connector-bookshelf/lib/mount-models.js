'use strict';
const _ = require('lodash');
const { singular } = require('pluralize');

const utilsModels = require('strapi-utils').models;
const relations = require('./relations');
const buildDatabaseSchema = require('./buildDatabaseSchema');
const {
  createComponentJoinTables,
  createComponentModels,
} = require('./generate-component-relations');
const { createParser } = require('./parser');
const { createFormatter } = require('./formatter');

const populateFetch = require('./populate');

const PIVOT_PREFIX = '_pivot_';

const LIFECYCLES = {
  creating: 'beforeCreate',
  created: 'afterCreate',
  destroying: 'beforeDestroy',
  destroyed: 'afterDestroy',
  updating: 'beforeUpdate',
  updated: 'afterUpdate',
  fetching: 'beforeFetch',
  'fetching:collection': 'beforeFetchAll',
  fetched: 'afterFetch',
  'fetched:collection': 'afterFetchAll',
  saving: 'beforeSave',
  saved: 'afterSave',
};

const getDatabaseName = connection => {
  const dbName = _.get(connection.settings, 'database');
  const dbSchema = _.get(connection.settings, 'schema', 'public');
  switch (_.get(connection.settings, 'client')) {
    case 'sqlite3':
      return 'main';
    case 'pg':
      return `${dbName}.${dbSchema}`;
    case 'mysql':
      return dbName;
    default:
      return dbName;
  }
};

module.exports = ({ models, target }, ctx) => {
  const { GLOBALS, connection, ORM } = ctx;

  // Parse every authenticated model.
  const updates = Object.keys(models).map(async model => {
    const definition = models[model];
    definition.globalName = _.upperFirst(_.camelCase(definition.globalId));
    definition.associations = [];

    // Define local GLOBALS to expose every models in this file.
    GLOBALS[definition.globalId] = {};

    // Add some information about ORM & client connection & tableName
    definition.orm = 'bookshelf';
    definition.databaseName = getDatabaseName(connection);
    definition.client = _.get(connection.settings, 'client');
    _.defaults(definition, {
      primaryKey: 'id',
      primaryKeyType: _.get(definition, 'options.idAttributeType', 'integer'),
    });

    // Use default timestamp column names if value is `true`
    if (_.get(definition, 'options.timestamps', false) === true) {
      _.set(definition, 'options.timestamps', ['created_at', 'updated_at']);
    }
    // Use false for values other than `Boolean` or `Array`
    if (
      !_.isArray(_.get(definition, 'options.timestamps')) &&
      !_.isBoolean(_.get(definition, 'options.timestamps'))
    ) {
      _.set(definition, 'options.timestamps', false);
    }

    // Register the final model for Bookshelf.
    const loadedModel = _.assign(
      {
        requireFetch: false,
        tableName: definition.collectionName,
        hasTimestamps: _.get(definition, 'options.timestamps', false),
        idAttribute: _.get(definition, 'options.idAttribute', 'id'),
        associations: [],
        defaults: Object.keys(definition.attributes).reduce((acc, current) => {
          if (
            definition.attributes[current].type &&
            definition.attributes[current].default
          ) {
            acc[current] = definition.attributes[current].default;
          }

          return acc;
        }, {}),
      },
      definition.options
    );

    const componentAttributes = Object.keys(definition.attributes).filter(key =>
      ['component', 'dynamiczone'].includes(definition.attributes[key].type)
    );

    if (_.isString(_.get(connection, 'options.pivot_prefix'))) {
      loadedModel.toJSON = function(options = {}) {
        const { shallow = false, omitPivot = false } = options;
        const attributes = this.serialize(options);

        if (!shallow) {
          const pivot = this.pivot && !omitPivot && this.pivot.attributes;

          // Remove pivot attributes with prefix.
          _.keys(pivot).forEach(
            key => delete attributes[`${PIVOT_PREFIX}${key}`]
          );

          // Add pivot attributes without prefix.
          const pivotAttributes = _.mapKeys(
            pivot,
            (value, key) => `${connection.options.pivot_prefix}${key}`
          );

          return Object.assign({}, attributes, pivotAttributes);
        }

        return attributes;
      };
    }

    await createComponentModels({
      model: loadedModel,
      definition,
      ORM,
      GLOBALS,
    });

    // Add every relationships to the loaded model for Bookshelf.
    // Basic attributes don't need this-- only relations.
    Object.keys(definition.attributes).forEach(name => {
      const details = definition.attributes[name];
      if (details.type !== undefined) {
        return;
      }

      const { nature, verbose } =
        utilsModels.getNature(details, name, undefined, model.toLowerCase()) ||
        {};

      // Build associations key
      utilsModels.defineAssociations(
        model.toLowerCase(),
        definition,
        details,
        name
      );

      let globalId;
      const globalName = details.model || details.collection || '';

      // Exclude polymorphic association.
      if (globalName !== '*') {
        globalId = details.plugin
          ? _.get(
              strapi.plugins,
              `${details.plugin}.models.${globalName.toLowerCase()}.globalId`
            )
          : _.get(strapi.models, `${globalName.toLowerCase()}.globalId`);
      }

      switch (verbose) {
        case 'hasOne': {
          const target = details.plugin
            ? strapi.plugins[details.plugin].models[details.model]
            : strapi.models[details.model];

          const FK = _.findKey(target.attributes, details => {
            if (
              _.has(details, 'model') &&
              details.model === model &&
              _.has(details, 'via') &&
              details.via === name
            ) {
              return details;
            }
          });

          const columnName = _.get(target.attributes, [FK, 'columnName'], FK);

          loadedModel[name] = function() {
            return this.hasOne(GLOBALS[globalId], columnName);
          };
          break;
        }
        case 'hasMany': {
          const columnName = details.plugin
            ? _.get(
                strapi.plugins,
                [
                  details.plugin,
                  'models',
                  details.collection,
                  'attributes',
                  details.via,
                  'columnName',
                ],
                details.via
              )
            : _.get(
                strapi.models,
                [model.collection, 'attributes', details.via, 'columnName'],
                details.via
              );

          // Set this info to be able to see if this field is a real database's field.
          details.isVirtual = true;

          loadedModel[name] = function() {
            return this.hasMany(GLOBALS[globalId], columnName);
          };
          break;
        }
        case 'belongsTo': {
          loadedModel[name] = function() {
            return this.belongsTo(
              GLOBALS[globalId],
              _.get(details, 'columnName', name)
            );
          };
          break;
        }
        case 'belongsToMany': {
          const targetModel = details.plugin
            ? strapi.plugins[details.plugin].models[details.collection]
            : strapi.models[details.collection];

          // Force singular foreign key
          details.attribute = singular(details.collection);
          details.column = targetModel.primaryKey;

          // Set this info to be able to see if this field is a real database's field.
          details.isVirtual = true;

          if (nature === 'manyWay') {
            const joinTableName = `${definition.collectionName}__${_.snakeCase(
              name
            )}`;

            const foreignKey = `${singular(definition.collectionName)}_${
              definition.primaryKey
            }`;

            let otherKey = `${details.attribute}_${details.column}`;

            if (otherKey === foreignKey) {
              otherKey = `related_${otherKey}`;
            }

            loadedModel[name] = function() {
              const targetBookshelfModel = GLOBALS[globalId];
              let collection = this.belongsToMany(
                targetBookshelfModel,
                joinTableName,
                foreignKey,
                otherKey
              );

              if (Array.isArray(details.withPivot)) {
                return collection.withPivot(details.withPivot);
              }

              return collection;
            };
          } else {
            const joinTableName =
              _.get(details, 'collectionName') ||
              utilsModels.getCollectionName(
                targetModel.attributes[details.via],
                details
              );

            const relationship = targetModel.attributes[details.via];

            // Define PK column
            relationship.attribute = singular(relationship.collection);
            relationship.column = definition.primaryKey;

            // Sometimes the many-to-many relationships
            // is on the same keys on the same models (ex: `friends` key in model `User`)
            if (
              `${details.attribute}_${details.column}` ===
              `${relationship.attribute}_${relationship.column}`
            ) {
              relationship.attribute = singular(details.via);
            }

            loadedModel[name] = function() {
              const targetBookshelfModel = GLOBALS[globalId];

              const foreignKey = `${relationship.attribute}_${relationship.column}`;
              const otherKey = `${details.attribute}_${details.column}`;

              let collection = this.belongsToMany(
                targetBookshelfModel,
                joinTableName,
                foreignKey,
                otherKey
              );

              if (Array.isArray(details.withPivot)) {
                return collection.withPivot(details.withPivot);
              }

              return collection;
            };
          }

          break;
        }
        case 'morphOne': {
          const model = details.plugin
            ? strapi.plugins[details.plugin].models[details.model]
            : strapi.models[details.model];

          const globalId = `${model.collectionName}_morph`;

          loadedModel[name] = function() {
            return this.morphOne(
              GLOBALS[globalId],
              details.via,
              `${definition.collectionName}`
            ).query(qb => {
              qb.where(
                _.get(model, ['attributes', details.via, 'filter'], 'field'),
                name
              );
            });
          };
          break;
        }
        case 'morphMany': {
          const collection = details.plugin
            ? strapi.plugins[details.plugin].models[details.collection]
            : strapi.models[details.collection];

          const globalId = `${collection.collectionName}_morph`;

          loadedModel[name] = function() {
            return this.morphMany(
              GLOBALS[globalId],
              details.via,
              `${definition.collectionName}`
            ).query(qb => {
              qb.where(
                _.get(model, ['attributes', details.via, 'filter'], 'field'),
                name
              );
            });
          };
          break;
        }
        case 'belongsToMorph':
        case 'belongsToManyMorph': {
          const association = definition.associations.find(
            association => association.alias === name
          );

          const morphValues = association.related.map(id => {
            let models = Object.values(strapi.models).filter(
              model => model.globalId === id
            );

            if (models.length === 0) {
              models = Object.values(strapi.components).filter(
                model => model.globalId === id
              );
            }

            if (models.length === 0) {
              models = Object.keys(strapi.plugins).reduce((acc, current) => {
                const models = Object.values(
                  strapi.plugins[current].models
                ).filter(model => model.globalId === id);

                if (acc.length === 0 && models.length > 0) {
                  acc = models;
                }

                return acc;
              }, []);
            }

            if (models.length === 0) {
              strapi.log.error(`Impossible to register the '${model}' model.`);
              strapi.log.error(
                'The collection name cannot be found for the morphTo method.'
              );
              strapi.stop();
            }

            return models[0].collectionName;
          });

          // Define new model.
          const options = {
            requireFetch: false,
            tableName: `${definition.collectionName}_morph`,
            [definition.collectionName]: function() {
              return this.belongsTo(
                GLOBALS[definition.globalId],
                `${definition.collectionName}_id`
              );
            },
            related: function() {
              return this.morphTo(
                name,
                ...association.related.map((id, index) => [
                  GLOBALS[id],
                  morphValues[index],
                ])
              );
            },
          };

          GLOBALS[options.tableName] = ORM.Model.extend(options);

          // Set polymorphic table name to the main model.
          target[model].morph = GLOBALS[options.tableName];

          // Hack Bookshelf to create a many-to-many polymorphic association.
          // Upload has many Upload_morph that morph to different model.
          loadedModel[name] = function() {
            if (verbose === 'belongsToMorph') {
              return this.hasOne(
                GLOBALS[options.tableName],
                `${definition.collectionName}_id`
              );
            }

            return this.hasMany(
              GLOBALS[options.tableName],
              `${definition.collectionName}_id`
            );
          };
          break;
        }
        default: {
          break;
        }
      }
    });

    // Call this callback function after we are done parsing
    // all attributes for relationships-- see below.

    const parseValue = createParser();
    try {
      // External function to map key that has been updated with `columnName`
      const mapper = (params = {}) => {
        Object.keys(params).map(key => {
          const attr = definition.attributes[key] || {};

          params[key] = parseValue(attr.type, params[key]);
        });

        return _.mapKeys(params, (value, key) => {
          const attr = definition.attributes[key] || {};

          return _.isPlainObject(attr) && _.isString(attr['columnName'])
            ? attr['columnName']
            : key;
        });
      };

      // Extract association except polymorphic.
      const associations = definition.associations.filter(
        association => association.nature.toLowerCase().indexOf('morph') === -1
      );
      // Extract polymorphic association.
      const polymorphicAssociations = definition.associations.filter(
        association => association.nature.toLowerCase().indexOf('morph') !== -1
      );

      // Update serialize to reformat data for polymorphic associations.
      loadedModel.serialize = function(options) {
        const attrs = _.clone(this.attributes);

        if (options && options.shallow) {
          return attrs;
        }

        const relations = this.relations;

        componentAttributes.forEach(key => {
          if (!_.has(relations, key)) return;

          const attr = definition.attributes[key];
          const { type } = attr;

          switch (type) {
            case 'component': {
              const { repeatable } = attr;

              const components = relations[key]
                .toJSON()
                .map(el => el.component);

              attrs[key] =
                repeatable === true ? components : _.first(components) || null;

              break;
            }
            case 'dynamiczone': {
              attrs[key] = relations[key].toJSON().map(el => {
                const componentKey = Object.keys(strapi.components).find(
                  key =>
                    strapi.components[key].collectionName === el.component_type
                );

                return {
                  __component: strapi.components[componentKey].uid,
                  ...el.component,
                };
              });

              break;
            }
            default: {
              throw new Error(`Invalid type for attribute ${key}: ${type}`);
            }
          }
        });

        polymorphicAssociations.map(association => {
          // Retrieve relation Bookshelf object.
          const relation = relations[association.alias];

          if (relation) {
            // Extract raw JSON data.
            attrs[association.alias] = relation.toJSON
              ? relation.toJSON(options)
              : relation;

            // Retrieve opposite model.
            const model = strapi.getModel(
              association.collection || association.model,
              association.plugin
            );

            // Reformat data by bypassing the many-to-many relationship.
            switch (association.nature) {
              case 'oneToManyMorph':
                attrs[association.alias] =
                  attrs[association.alias][model.collectionName] || null;
                break;
              case 'manyToManyMorph':
                attrs[association.alias] = attrs[association.alias].map(
                  rel => rel[model.collectionName]
                );
                break;
              case 'oneMorphToOne': {
                const obj = attrs[association.alias];

                if (obj === undefined || obj === null) {
                  break;
                }

                const contentType = strapi.db.getModelByCollectionName(
                  obj[`${association.alias}_type`]
                );

                attrs[association.alias] = {
                  __contentType: contentType ? contentType.globalId : null,
                  ...obj.related,
                };

                break;
              }
              case 'manyMorphToOne':
              case 'manyMorphToMany':
                attrs[association.alias] = attrs[association.alias].map(obj => {
                  const contentType = strapi.db.getModelByCollectionName(
                    obj[`${association.alias}_type`]
                  );

                  return {
                    __contentType: contentType ? contentType.globalId : null,
                    ...obj.related,
                  };
                });
                break;
              default:
            }
          }
        });

        associations.map(association => {
          const relation = relations[association.alias];

          if (relation) {
            // Extract raw JSON data.
            attrs[association.alias] = relation.toJSON
              ? relation.toJSON(options)
              : relation;
          }
        });

        return attrs;
      };

      // Initialize lifecycle callbacks.
      loadedModel.initialize = function() {
        // Load bookshelf plugin arguments from model options
        this.constructor.__super__.initialize.apply(this, arguments);

        _.forEach(LIFECYCLES, (fn, key) => {
          if (_.isFunction(target[model.toLowerCase()][fn])) {
            this.on(key, target[model.toLowerCase()][fn]);
          }
        });

        // Update withRelated level to bypass many-to-many association for polymorphic relationshiips.
        // Apply only during fetching.
        this.on('fetching fetching:collection', (instance, attrs, options) => {
          populateFetch(definition, options);

          return _.isFunction(target[model.toLowerCase()]['beforeFetchAll'])
            ? target[model.toLowerCase()]['beforeFetchAll']
            : Promise.resolve();
        });

        this.on('saving', (instance, attrs) => {
          instance.attributes = _.assign(instance.attributes, mapper(attrs));

          return _.isFunction(target[model.toLowerCase()]['beforeSave'])
            ? target[model.toLowerCase()]['beforeSave']
            : Promise.resolve();
        });

        const formatValue = createFormatter(definition.client);
        function formatEntry(entry) {
          Object.keys(entry.attributes).forEach(key => {
            const attr = definition.attributes[key] || {};
            entry.attributes[key] = formatValue(attr, entry.attributes[key]);
          });
        }

        function formatOutput(instance) {
          if (Array.isArray(instance.models)) {
            instance.models.forEach(entry => formatEntry(entry));
          } else {
            formatEntry(instance);
          }
        }

        const events = [
          {
            name: 'saved',
            target: 'afterSave',
          },
          {
            name: 'fetched',
            target: 'afterFetch',
          },
          {
            name: 'fetched:collection',
            target: 'afterFetchAll',
          },
        ];

        events.forEach(event => {
          this.on(event.name, instance => {
            formatOutput(instance);

            return _.isFunction(target[model.toLowerCase()][event.target])
              ? target[model.toLowerCase()][event.target]
              : Promise.resolve();
          });
        });
      };

      loadedModel.hidden = _.keys(
        _.keyBy(
          _.filter(definition.attributes, (value, key) => {
            if (
              _.has(value, 'columnName') &&
              !_.isEmpty(value.columnName) &&
              value.columnName !== key
            ) {
              return true;
            }
          }),
          'columnName'
        )
      );

      GLOBALS[definition.globalId] = ORM.Model.extend(loadedModel);

      // Expose ORM functions through the `strapi.models[xxx]`
      // or `strapi.plugins[xxx].models[yyy]` object.
      target[model] = _.assign(GLOBALS[definition.globalId], target[model]);

      // Push attributes to be aware of model schema.
      target[model]._attributes = definition.attributes;
      target[model].updateRelations = relations.update;

      await buildDatabaseSchema({
        ORM,
        definition,
        loadedModel,
        connection,
        model: target[model],
      });

      await createComponentJoinTables({ definition, ORM });
    } catch (err) {
      strapi.log.error(`Impossible to register the '${model}' model.`);
      strapi.log.error(err);
      strapi.stop();
    }
  });

  return Promise.all(updates);
};
