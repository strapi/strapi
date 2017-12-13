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

      const done = _.after(_.size(connections), cb);

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

        // Select models concerned by this connection
        const models = _.pickBy(strapi.models, { connection: connectionName });
        // Will call the done() method when every models will be loaded.
        const loadedHook = _.after(_.size(models), done);

        const mountModels = (models, target, plugin = false) => {
          // Parse every registered model.
          _.forEach(models, (definition, model) => {
            definition.globalName = _.upperFirst(_.camelCase(definition.globalId));

            _.defaults(definition, {
              primaryKey: 'id'
            });

            // Define local GLOBALS to expose every models in this file.
            GLOBALS[definition.globalId] = {};

            // Add some informations about ORM & client connection & tableName
            definition.collectionName = _.isEmpty(definition.collectionName) ? definition.globalName.toLowerCase() : definition.collectionName;
            definition.orm = 'bookshelf';
            definition.client = _.get(connection.settings, 'client');

            // Register the final model for Bookshelf.
            const loadedModel = _.assign({
                tableName: definition.collectionName,
                hasTimestamps: _.get(definition, 'options.timestamps') === true,
                idAttribute: _.get(definition, 'options.idAttribute', 'id')
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

                loadedHook();
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
                definition.globalName,
                definition,
                details,
                name
              );

              const globalId = details.plugin ?
                _.get(strapi.plugins,`${details.plugin}.models.${(details.model || details.collection || '').toLowerCase()}.globalId`):
                _.get(strapi.models, `${(details.model || details.collection || '').toLowerCase()}.globalId`);

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
    },

    getQueryParams: (value, type, key) => {
      const result = {};

      switch (type) {
        case '=':
          result.key = `where.${key}[0]`;
          result.value = {
            symbol: '=',
            value
          };
          break;
        case '_ne':
          result.key = `where.${key}[0]`;
          result.value = {
            symbol: '!=',
            value
          };
          break;
        case '_lt':
          result.key = `where.${key}[0]`;
          result.value = {
            symbol: '<',
            value
          };
          break;
        case '_gt':
          result.key = `where.${key}[0]`;
          result.value = {
            symbol: '>',
            value
          };
          break;
        case '_lte':
          result.key = `where.${key}[0]`;
          result.value = {
            symbol: '<=',
            value
          };
          break;
        case '_gte':
          result.key = `where.${key}[0]`;
          result.value = {
            symbol: '>=',
            value
          };
          break;
        case '_sort':
          result.key = `sort`;
          result.value = (value === 'desc') ? '-' : '';
          result.value += key;
          break;
        case '_start':
          result.key = `start`;
          result.value = parseFloat(value);
          break;
        case '_limit':
          result.key = `limit`;
          result.value = parseFloat(value);
          break;
        default:
          result = undefined;
      }

      return result;
    },

    manageRelations: async function (model, params) {
      const models = strapi.models;
      const Model = strapi.models[model];

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

                      if (record && _.isObject(record[details.via])) {
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
                  }));
                });

                toRemove.forEach(value => {
                  value[details.via] = null;

                  virtualFields.push(this.removeRelation(details.model || details.collection, {
                    id: value[Model.primaryKey] || value.id || value._id,
                    values: association.nature === 'manyToMany' ? params.values : value,
                    foreignKey: current
                  }));
                });
              } else if (_.get(Model._attributes, `${current}.isVirtual`) !== true) {
                acc[current] = params.values[current];
              }

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

    addRelation: async function (model, params) {
      const Model = strapi.models[model];
      const association = Model.associations.filter(x => x.via === params.foreignKey)[0];

      if (!association) {
        // Resolve silently.
        return Promise.resolve();
      }

      switch (association.nature) {
        case 'oneToOne':
        case 'oneToMany':
          return this.manageRelations(model, params)
        case 'manyToMany':
          return Model.forge({
            [Model.primaryKey]: parseFloat(params[Model.primaryKey])
          })[association.alias]().attach(params.values[Model.primaryKey]);
        default:
          // Resolve silently.
          return Promise.resolve();
      }
    },

    removeRelation: async function (model, params) {
      const Model = strapi.models[model];
      const association = Model.associations.filter(x => x.via === params.foreignKey)[0];

      if (!association) {
        // Resolve silently.
        return Promise.resolve();
      }

      switch (association.nature) {
        case 'oneToOne':
        case 'oneToMany':
          return this.manageRelations(model, params)
        case 'manyToMany':
          return Model.forge({
            [Model.primaryKey]: parseFloat(params[Model.primaryKey])
          })[association.alias]().detach(params.values[Model.primaryKey]);
        default:
          // Resolve silently.
          return Promise.resolve();
      }
    }
  };

  return hook;
};
