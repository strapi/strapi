'use strict';

/**
 * Module dependencies
 */

// Core
const path = require('path');

// Public node modules.
const _ = require('lodash');
const bookshelf = require('bookshelf');
const pluralize = require('pluralize');

// Local helpers.
const utils = require('./utils/');

// Strapi helpers for models.
const utilsModels = require('strapi-utils').models;

const PIVOT_PREFIX = '_pivot_';
const GLOBALS = {};

/**
 * Bookshelf hook
 */

module.exports = function(strapi) {
  const hook = {
    /**
     * Default options
     */

    defaults: {
      defaultConnection: 'default',
      host: 'localhost'
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      const connections = _.pickBy(strapi.config.connections, { connector: 'strapi-bookshelf' });

      _.forEach(connections, (connection, connectionName) => {
        // Apply defaults
        _.defaults(connection.settings, strapi.config.hook.settings.bookshelf);

        // Create Bookshelf instance for this connection.
        const ORM = new bookshelf(strapi.connections[connectionName]);

        try {
          // Require `config/functions/bookshelf.js` file to customize connection.
          require(path.resolve(
            strapi.config.appPath,
            'config',
            'functions',
            'bookshelf.js'
          ))(ORM, strapi.connections[connectionName]);
        } catch (err) {
          // This is not an error if the file is not found.
        }

        // Load plugins
        if (_.get(connection, 'options.plugins', true) !== false) {
          ORM.plugin('visibility');
          ORM.plugin('pagination');
        }

        const mountModels = (models, target, plugin = false) => {
          // Parse every authenticated model.
          _.forEach(models, (definition, model) => {
            definition.globalName = _.upperFirst(_.camelCase(definition.globalId));

            _.defaults(definition, {
              primaryKey: 'id'
            });

            // Define local GLOBALS to expose every models in this file.
            GLOBALS[definition.globalId] = {};

            // Add some informations about ORM & client connection & tableName
            definition.orm = 'bookshelf';
            definition.client = _.get(connection.settings, 'client');

            // Register the final model for Bookshelf.
            const loadedModel = _.assign({
                tableName: definition.collectionName,
                hasTimestamps: _.get(definition, 'options.timestamps') === true,
                idAttribute: _.get(definition, 'options.idAttribute', 'id'),
                associations: [],
                defaults: Object.keys(definition.attributes).reduce((acc, current) => {
                  if (definition.attributes[current].type && definition.attributes[current].default) {
                    acc[current] = definition.attributes[current].default;
                  }

                  return acc;
                }, {})
              }, definition.options);

            if (_.isString(_.get(connection, 'options.pivot_prefix'))) {
              loadedModel.toJSON = function(options = {}) {
                const { shallow = false, omitPivot = false } = options;
                const attributes = this.serialize(options);

                if (!shallow) {
                  const pivot = this.pivot && !omitPivot && this.pivot.attributes;

                  // Remove pivot attributes with prefix.
                  _.keys(pivot).forEach(key => delete attributes[`${PIVOT_PREFIX}${key}`]);

                  // Add pivot attributes without prefix.
                  const pivotAttributes = _.mapKeys(pivot, (value, key) => `${connection.options.pivot_prefix}${key}`);

                  return Object.assign({}, attributes, pivotAttributes);
                }

                return attributes;
              };
            }

            // Initialize the global variable with the
            // capitalized model name.
            if (!plugin) {
              global[definition.globalName] = {};
            }

            // Call this callback function after we are done parsing
            // all attributes for relationships-- see below.
            const done = _.after(_.size(definition.attributes), () => {
              try {
                // External function to map key that has been updated with `columnName`
                const mapper = (params = {}) =>
                  _.mapKeys(params, (value, key) => {
                    const attr = definition.attributes[key] || {};

                    return _.isPlainObject(attr) &&
                      _.isString(attr['columnName'])
                      ? attr['columnName']
                      : key;
                  });

                // Update serialize to reformat data for polymorphic associations.
                loadedModel.serialize = function(options) {
                  const attrs = _.clone(this.attributes);

                  if (options && options.shallow) {
                    return attrs;
                  }

                  const relations = this.relations;

                  // Extract association except polymorphic.
                  const associations = definition.associations
                    .filter(association => association.nature.toLowerCase().indexOf('morph') === -1);
                  // Extract polymorphic association.
                  const polymorphicAssociations = definition.associations
                    .filter(association => association.nature.toLowerCase().indexOf('morph') !== -1);

                  polymorphicAssociations.map(association => {
                    // Retrieve relation Bookshelf object.
                    const relation = relations[association.alias];

                    if (relation) {
                      // Extract raw JSON data.
                      attrs[association.alias] = relation.toJSON ? relation.toJSON(options) : relation;

                      // Retrieve opposite model.
                      const model = association.plugin ?
                        strapi.plugins[association.plugin].models[association.collection || association.model]:
                        strapi.models[association.collection || association.model];

                      // Reformat data by bypassing the many-to-many relationship.
                      switch (association.nature) {
                        case 'oneToManyMorph':
                          attrs[association.alias] = attrs[association.alias][model.collectionName];
                          break;
                        case 'manyToManyMorph':
                          attrs[association.alias] = attrs[association.alias].map(rel => rel[model.collectionName]);
                          break;
                        case 'oneMorphToOne':
                          attrs[association.alias] = attrs[association.alias].related;
                          break;
                        case 'manyMorphToOne':
                        case 'manyMorphToMany':
                          attrs[association.alias] = attrs[association.alias].map(obj => obj.related);
                          break;
                        default:
                      }
                    }
                  });

                  associations.map(association => {
                    const relation = relations[association.alias];

                    if (relation) {
                      // Extract raw JSON data.
                      attrs[association.alias] = relation.toJSON ? relation.toJSON(options) : relation;
                    }
                  });

                  return attrs;
                }

                // Initialize lifecycle callbacks.
                loadedModel.initialize = function() {
                  const lifecycle = {
                    creating: 'beforeCreate',
                    created: 'afterCreate',
                    destroying: 'beforeDestroy',
                    destroyed: 'afterDestroy',
                    updating: 'beforeUpdate',
                    updated: 'afterUpdate',
                    fetching: 'beforeFetch',
                    'fetching:collection': 'beforeFetchCollection',
                    fetched: 'afterFetch',
                    'fetched:collection': 'afterFetchCollection',
                    saving: 'beforeSave',
                    saved: 'afterSave'
                  };

                  _.forEach(lifecycle, (fn, key) => {
                    if (_.isFunction(target[model.toLowerCase()][fn])) {
                      this.on(key, target[model.toLowerCase()][fn]);
                    }
                  });

                  // Update withRelated level to bypass many-to-many association for polymorphic relationshiips.
                  // Apply only during fetching.
                  this.on('fetching fetching:collection', (instance, attrs, options) => {
                    if (_.isArray(options.withRelated)) {
                      options.withRelated = options.withRelated.map(path => {
                        const association = definition.associations
                          .filter(association => association.nature.toLowerCase().indexOf('morph') !== -1)
                          .filter(association => association.alias === path || association.via === path)[0];
                        if (association) {
                          // Override on polymorphic path only.
                          if (_.isString(path) && path === association.via) {
                            return `related.${association.via}`;
                          } else if (_.isString(path) && path === association.alias) {
                            // MorphTo side.
                            if (association.related) {
                              return `${association.alias}.related`;
                            }

                            // oneToMorph or manyToMorph side.
                            // Retrieve collection name because we are using it to build our hidden model.
                            const model = association.plugin ?
                              strapi.plugins[association.plugin].models[association.collection || association.model]:
                              strapi.models[association.collection || association.model];

                            return `${association.alias}.${model.collectionName}`;
                          }
                        }

                        return path;
                      });
                    }

                    return _.isFunction(
                      target[model.toLowerCase()]['beforeFetchCollection']
                    )
                      ? target[model.toLowerCase()]['beforeFetchCollection']
                      : Promise.resolve();
                  });

                  this.on('saving', (instance, attrs, options) => {
                    instance.attributes = mapper(instance.attributes);
                    attrs = mapper(attrs);

                    return _.isFunction(
                      target[model.toLowerCase()]['beforeSave']
                    )
                      ? target[model.toLowerCase()]['beforeSave']
                      : Promise.resolve();
                  });
                };

                loadedModel.hidden = _.keys(
                  _.keyBy(
                    _.filter(definition.attributes, (value, key) => {
                      if (
                        value.hasOwnProperty('columnName') &&
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

                if (!plugin) {
                  // Only expose as real global variable the models which
                  // are not scoped in a plugin.
                  global[definition.globalId] = GLOBALS[definition.globalId];
                }

                // Expose ORM functions through the `strapi.models[xxx]`
                // or `strapi.plugins[xxx].models[yyy]` object.
                target[model] = _.assign(GLOBALS[definition.globalId], target[model]);

                // Push attributes to be aware of model schema.
                target[model]._attributes = definition.attributes;

              } catch (err) {
                strapi.log.error('Impossible to register the `' + model + '` model.');
                strapi.log.error(err);
                strapi.stop();
              }
            });

            if (_.isEmpty(definition.attributes)) {
              done();
            }

            // Add every relationships to the loaded model for Bookshelf.
            // Basic attributes don't need this-- only relations.
            _.forEach(definition.attributes, (details, name) => {
              const verbose = _.get(
                utilsModels.getNature(details, name, undefined, model.toLowerCase()),
                'verbose'
              ) || '';

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
                globalId = details.plugin ?
                  _.get(strapi.plugins,`${details.plugin}.models.${globalName.toLowerCase()}.globalId`):
                  _.get(strapi.models, `${globalName.toLowerCase()}.globalId`);
              }

              switch (verbose) {
                case 'hasOne': {
                  const FK = details.plugin ?
                    _.findKey(
                      strapi.plugins[details.plugin].models[details.model].attributes,
                      details => {
                        if (
                          details.hasOwnProperty('model') &&
                          details.model === model &&
                          details.hasOwnProperty('via') &&
                          details.via === name
                        ) {
                          return details;
                        }
                      }
                    ):
                    _.findKey(
                      strapi.models[details.model].attributes,
                      details => {
                        if (
                          details.hasOwnProperty('model') &&
                          details.model === model &&
                          details.hasOwnProperty('via') &&
                          details.via === name
                        ) {
                          return details;
                        }
                      }
                    );

                  const columnName = details.plugin ?
                    _.get(strapi.plugins, `${details.plugin}.models.${details.model}.attributes.${FK}.columnName`, FK):
                    _.get(strapi.models, `${details.model}.attributes.${FK}.columnName`, FK);

                  loadedModel[name] = function() {
                    return this.hasOne(
                      GLOBALS[globalId],
                      columnName
                    );
                  };
                  break;
                }
                case 'hasMany': {
                  const columnName = details.plugin ?
                    _.get(strapi.plugins, `${details.plugin}.models.${globalId.toLowerCase()}.attributes.${details.via}.columnName`, details.via):
                    _.get(strapi.models[globalId.toLowerCase()].attributes, `${details.via}.columnName`, details.via);

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
                  const collection = details.plugin ?
                    strapi.plugins[details.plugin].models[details.collection]:
                    strapi.models[details.collection];

                  const collectionName = _.get(details, 'collectionName') ||
                    _.map(
                      _.sortBy(
                        [
                          collection.attributes[
                            details.via
                          ],
                          details
                        ],
                        'collection'
                      ),
                      table => {
                        return _.snakeCase(
                          pluralize.plural(table.collection) +
                            ' ' +
                            pluralize.plural(table.via)
                        );
                      }
                    ).join('__');

                  const relationship = _.clone(
                    collection.attributes[details.via]
                  );

                  // Force singular foreign key
                  relationship.attribute = pluralize.singular(
                    relationship.collection
                  );
                  details.attribute = pluralize.singular(details.collection);

                  // Define PK column
                  details.column = utils.getPK(model, strapi.models);
                  relationship.column = utils.getPK(
                    details.collection,
                    strapi.models
                  );

                  // Sometimes the many-to-many relationships
                  // is on the same keys on the same models (ex: `friends` key in model `User`)
                  if (
                    details.attribute + '_' + details.column ===
                    relationship.attribute + '_' + relationship.column
                  ) {
                    relationship.attribute = pluralize.singular(details.via);
                  }

                  // Set this info to be able to see if this field is a real database's field.
                  details.isVirtual = true;

                  loadedModel[name] = function() {
                    if (
                      _.isArray(_.get(details, 'withPivot')) &&
                      !_.isEmpty(details.withPivot)
                    ) {
                      return this.belongsToMany(
                        GLOBALS[globalId],
                        collectionName,
                        relationship.attribute + '_' + relationship.column,
                        details.attribute + '_' + details.column
                      ).withPivot(details.withPivot);
                    }

                    return this.belongsToMany(
                      GLOBALS[globalId],
                      collectionName,
                      relationship.attribute + '_' + relationship.column,
                      details.attribute + '_' + details.column
                    );
                  };
                  break;
                }
                case 'morphOne': {
                  const model = details.plugin ?
                    strapi.plugins[details.plugin].models[details.model]:
                    strapi.models[details.model];

                  const globalId = `${model.collectionName}_morph`;

                  loadedModel[name] =  function() {
                    return this
                      .morphOne(GLOBALS[globalId], details.via, `${definition.collectionName}`)
                      .query(qb => {
                        qb.where(_.get(model, `attributes.${details.via}.filter`, 'field'), name);
                      });
                  }
                  break;
                }
                case 'morphMany': {
                  const collection = details.plugin ?
                    strapi.plugins[details.plugin].models[details.collection]:
                    strapi.models[details.collection];

                  const globalId = `${collection.collectionName}_morph`;

                  loadedModel[name] =  function() {
                    return this
                      .morphMany(GLOBALS[globalId], details.via, `${definition.collectionName}`)
                      .query(qb => {
                        qb.where(_.get(collection, `attributes.${details.via}.filter`, 'field'), name);
                      });
                  }
                  break;
                }
                case 'belongsToMorph':
                case 'belongsToManyMorph': {
                  const association = definition.associations
                    .find(association => association.alias === name);

                  const morphValues = association.related.map(id => {
                    let models = Object.values(strapi.models).filter(model => model.globalId === id);

                    if (models.length === 0) {
                      models = Object.keys(strapi.plugins).reduce((acc, current) => {
                        const models = Object.values(strapi.plugins[current].models).filter(model => model.globalId === id);

                        if (acc.length === 0 && models.length > 0) {
                          acc = models;
                        }

                        return acc;
                      }, []);
                    }

                    if (models.length === 0) {
                      strapi.log.error('Impossible to register the `' + model + '` model.');
                      strapi.log.error('The collection name cannot be found for the morphTo method.');
                      strapi.stop();
                    }

                    return models[0].collectionName;
                  });

                  // Define new model.
                  const options = {
                    tableName: `${definition.collectionName}_morph`,
                    [definition.collectionName]: function () {
                      return this
                        .belongsTo(
                          GLOBALS[definition.globalId],
                          `${definition.collectionName}_id`
                        );
                    },
                    related: function () {
                      return this
                        .morphTo(name, ...association.related.map((id, index) => [GLOBALS[id], morphValues[index]]));
                    }
                  };

                  GLOBALS[options.tableName] = ORM.Model.extend(options);

                  // Set polymorphic table name to the main model.
                  target[model].morph = GLOBALS[options.tableName];

                  // Hack Bookshelf to create a many-to-many polymorphic association.
                  // Upload has many Upload_morph that morph to different model.
                  loadedModel[name] = function () {
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

              done();
            });
          });
        };

        // Mount `./api` models.
        mountModels(_.pickBy(strapi.models, { connection: connectionName }), strapi.models);

        // Mount `./plugins` models.
        _.forEach(strapi.plugins, (plugin, name) => {
          mountModels(_.pickBy(strapi.plugins[name].models, { connection: connectionName }), plugin.models, name);
        });
      });

      cb();
    },

    getQueryParams: (value, type, key) => {
      const result = {};

      switch (type) {
        case '=':
          result.key = `where.${key}`;
          result.value = {
            symbol: '=',
            value
          };
          break;
        case '_ne':
          result.key = `where.${key}`;
          result.value = {
            symbol: '!=',
            value
          };
          break;
        case '_lt':
          result.key = `where.${key}`;
          result.value = {
            symbol: '<',
            value
          };
          break;
        case '_gt':
          result.key = `where.${key}`;
          result.value = {
            symbol: '>',
            value
          };
          break;
        case '_lte':
          result.key = `where.${key}`;
          result.value = {
            symbol: '<=',
            value
          };
          break;
        case '_gte':
          result.key = `where.${key}`;
          result.value = {
            symbol: '>=',
            value
          };
          break;
        case '_sort':
          result.key = `sort`;
          result.value = {
            key,
            order: value.toUpperCase()
          };
          break;
        case '_start':
          result.key = `start`;
          result.value = parseFloat(value);
          break;
        case '_limit':
          result.key = `limit`;
          result.value = parseFloat(value);
          break;
        case '_contains':
        case '_containss':
          result.key = `where.${key}`;
          result.value = {
            symbol: 'like',
            value: `%${value}%`
          };
          break;
        default:
          return undefined;
      }

      return result;
    },

    manageRelations: async function (model, params) {
      const models = _.assign(_.clone(strapi.models), Object.keys(strapi.plugins).reduce((acc, current) => {
        _.assign(acc, strapi.plugins[current].models);
        return acc;
      }, {}));

      const Model = models[model];

      const virtualFields = [];
      const record = await Model
        .forge({
          [Model.primaryKey]: params[Model.primaryKey]
        })
        .fetch({
          withRelated: Model.associations.map(x => x.alias)
        });

      const response = record ? record.toJSON() : record;

      // Only update fields which are on this document.
      const values = params.parseRelationships === false ? params.values : Object.keys(JSON.parse(JSON.stringify(params.values))).reduce((acc, current) => {
        const association = Model.associations.filter(x => x.alias === current)[0];
        const details = Model._attributes[current];

        if (_.get(Model._attributes, `${current}.isVirtual`) !== true && _.isUndefined(association)) {
          acc[current] = params.values[current];
        } else {
          switch (association.nature) {
            case 'oneWay':
              acc[current] = _.get(params.values[current], this.primaryKey, params.values[current]) || null;

              break;
            case 'oneToOne':
              if (response[current] !== params.values[current]) {
                const value = _.isNull(params.values[current]) ? response[current] : params.values;

                const recordId = _.isNull(params.values[current]) ? value[Model.primaryKey] || value.id || value._id : typeof value[current] === 'object' ? value[current].id : value[current];

                if (response[current] && _.isObject(response[current]) && response[current][Model.primaryKey] !== value[current]) {
                  virtualFields.push(
                    this.manageRelations(details.collection || details.model, {
                      id: response[current][Model.primaryKey],
                      values: {
                        [details.via]: null
                      },
                      parseRelationships: false
                    })
                  );
                }

                // Remove previous relationship asynchronously if it exists.
                virtualFields.push(
                  models[details.model || details.collection]
                    .forge({ id : recordId })
                    .fetch({
                      withRelated: models[details.model || details.collection].associations.map(x => x.alias)
                    })
                    .then(response => {
                      const record = response ? response.toJSON() : response;

                      if (record && _.isObject(record[details.via]) && record[details.via][current] !== value[current]) {
                        return this.manageRelations(model, {
                          id: record[details.via][models[details.model || details.collection].primaryKey] || record[details.via].id,
                          values: {
                            [current]: null
                          },
                          parseRelationships: false
                        });
                      }

                      return Promise.resolve();
                    })
                );

                // Update the record on the other side.
                // When params.values[current] is null this means that we are removing the relation.
                virtualFields.push(this.manageRelations(details.model || details.collection, {
                  id: recordId,
                  values: {
                    [details.via]: _.isNull(params.values[current]) ? null : value[Model.primaryKey] || params.id || params._id || value.id || value._id
                  },
                  parseRelationships: false
                }));

                acc[current] = _.isNull(params.values[current]) ? null : typeof value[current] === 'object' ? value[current][Model.primaryKey] : value[current];
              }

              break;
            case 'oneToMany':
            case 'manyToOne':
            case 'manyToMany':
              if (details.dominant === true) {
                acc[current] = params.values[current];
              } else if (response[current] && _.isArray(response[current]) && current !== 'id') {
                // Records to add in the relation.
                const toAdd = _.differenceWith(params.values[current], response[current], (a, b) =>
                  ((typeof a === 'number') ? a : a[Model.primaryKey].toString()) === b[Model.primaryKey].toString()
                );
                // Records to remove in the relation.
                const toRemove = _.differenceWith(response[current], params.values[current], (a, b) =>
                  a[Model.primaryKey].toString() === ((typeof b === 'number') ? b : b[Model.primaryKey].toString())
                )
                  .filter(x => toAdd.find(y => x.id === y.id) === undefined);

                // Push the work into the flow process.
                toAdd.forEach(value => {
                  value = (typeof value === 'number') ? { id: value } : value;

                  value[details.via] = parseFloat(params[Model.primaryKey]);
                  params.values[Model.primaryKey] = parseFloat(params[Model.primaryKey]);

                  virtualFields.push(this.addRelation(details.model || details.collection, {
                    id: value[Model.primaryKey] || value.id || value._id,
                    values: association.nature === 'manyToMany' ? params.values : value,
                    foreignKey: current
                  }, details.plugin));
                });

                toRemove.forEach(value => {
                  value[details.via] = null;

                  virtualFields.push(this.removeRelation(details.model || details.collection, {
                    id: value[Model.primaryKey] || value.id || value._id,
                    values: association.nature === 'manyToMany' ? params.values : value,
                    foreignKey: current
                  }, details.plugin));
                });
              } else if (_.get(Model._attributes, `${current}.isVirtual`) !== true) {
                acc[current] = params.values[current];
              }

              break;
            case 'manyMorphToMany':
            case 'manyMorphToOne':
              // Update the relational array.
              params.values[current].forEach(obj => {
                const model = obj.source && obj.source !== 'content-manager' ?
                  strapi.plugins[obj.source].models[obj.ref]:
                  strapi.models[obj.ref];

                virtualFields.push(this.addRelationMorph(details.model || details.collection, {
                  id: response[this.primaryKey],
                  alias: association.alias,
                  ref: model.collectionName,
                  refId: obj.refId,
                  field: obj.field
                }, obj.source));
              });
              break;
            case 'oneToManyMorph':
            case 'manyToManyMorph':
              const transformToArrayID = (array) => {
                if(_.isArray(array)) {
                  return array.map(value => {
                    if (_.isPlainObject(value)) {
                      return value._id || value.id;
                    }

                    return value;
                  })
                }

                if (association.type === 'model') {
                  return _.isEmpty(array) ? [] : transformToArrayID([array]);
                }

                return [];
              };

              // Compare array of ID to find deleted files.
              const currentValue = transformToArrayID(response[current]).map(id => id.toString());
              const storedValue = transformToArrayID(params.values[current]).map(id => id.toString());

              const toAdd = _.difference(storedValue, currentValue);
              const toRemove = _.difference(currentValue, storedValue);

              toAdd.forEach(id => {
                virtualFields.push(this.addRelationMorph(details.model || details.collection, {
                  id,
                  alias: association.via,
                  ref: Model.collectionName,
                  refId: response.id,
                  field: association.alias
                }, details.plugin));
              });

              // Update the relational array.
              toRemove.forEach(id => {
                virtualFields.push(this.removeRelationMorph(details.model || details.collection, {
                  id,
                  alias: association.via,
                  ref: Model.collectionName,
                  refId: response.id,
                  field: association.alias
                }, details.plugin));
              });
              break;
            case 'oneMorphToOne':
            case 'oneMorphToMany':
              break;
            default:
          }
        }

        return acc;
      }, {});

      if (!_.isEmpty(values)) {
        virtualFields.push(Model
          .forge({
            [Model.primaryKey]: params[Model.primaryKey]
          })
          .save(values, {
            patch: true
          }));
      } else {
        virtualFields.push(Promise.resolve(_.assign(response, params.values)));
      }

      // Update virtuals fields.
      await Promise.all(virtualFields);
    },

    addRelation: async function (model, params, source) {
      const models = _.assign(_.clone(strapi.models), Object.keys(strapi.plugins).reduce((acc, current) => {
        _.assign(acc, strapi.plugins[current].models);
        return acc;
      }, {}));

      const Model = models[model];
      const association = Model.associations.filter(x => x.via === params.foreignKey)[0];

      if (!association) {
        // Resolve silently.
        return Promise.resolve();
      }

      switch (association.nature) {
        case 'oneToOne':
        case 'oneToMany':
          return this.manageRelations(model, params);
        case 'manyToMany':
          return Model.forge({
            [Model.primaryKey]: parseFloat(params[Model.primaryKey])
          })[association.alias]().attach(params.values[Model.primaryKey]);
        default:
          // Resolve silently.
          return Promise.resolve();
      }
    },

    removeRelation: async function (model, params, source) {
      const models = _.assign(_.clone(strapi.models), Object.keys(strapi.plugins).reduce((acc, current) => {
        _.assign(acc, strapi.plugins[current].models);
        return acc;
      }, {}));

      const Model = models[model];

      const association = Model.associations.filter(x => x.via === params.foreignKey)[0];

      if (!association) {
        // Resolve silently.
        return Promise.resolve();
      }

      switch (association.nature) {
        case 'oneToOne':
        case 'oneToMany':
          return this.manageRelations(model, params);
        case 'manyToMany':
          return Model.forge({
            [Model.primaryKey]: parseFloat(params[Model.primaryKey])
          })[association.alias]().detach(params.values[Model.primaryKey]);
        default:
          // Resolve silently.
          return Promise.resolve();
      }
    },

    addRelationMorph: async function (model, params, source) {
      const models = _.assign(_.clone(strapi.models), Object.keys(strapi.plugins).reduce((acc, current) => {
        _.assign(acc, strapi.plugins[current].models);
        return acc;
      }, {}));

      const Model = models[model];

      const record = await Model.morph.forge()
        .where({
          [`${Model.collectionName}_id`]: params.id,
          [`${params.alias}_id`]: params.refId,
          [`${params.alias}_type`]: params.ref,
          field: params.field
        })
        .fetch({
          withRelated: Model.associations.map(x => x.alias)
        });

      const entry = record ? record.toJSON() : record;

      if (entry) {
        return Promise.resolve();
      }

      return await Model.morph.forge({
          [`${Model.collectionName}_id`]: params.id,
          [`${params.alias}_id`]: params.refId,
          [`${params.alias}_type`]: params.ref,
          field: params.field
        })
        .save();
    },

    removeRelationMorph: async function (model, params, source) {
      const models = _.assign(_.clone(strapi.models), Object.keys(strapi.plugins).reduce((acc, current) => {
        _.assign(acc, strapi.plugins[current].models);
        return acc;
      }, {}));

      const Model = models[model];

      return await Model.morph.forge()
        .where({
          [`${Model.collectionName}_id`]: params.id,
          [`${params.alias}_id`]: params.refId,
          [`${params.alias}_type`]: params.ref,
          field: params.field
        })
        .destroy();
    }
  };

  return hook;
};
