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
      let globalName;

      // Make sure the Knex hook is present since Knex needs it.
      if (!strapi.hooks.knex) {
        strapi.log.error(
          'Impossible to load the ORM without the query builder!'
        );
        strapi.log.error(
          'You need to install the Strapi query builder with `$ npm install strapi-knex --save`.'
        );
        strapi.stop(1);
      }

      // Only run this logic after the Knex has finished to load.
      strapi.after('hook:knex:loaded', () => {
        // Initialize collections
        _.set(strapi, 'bookshelf.collections', {});

        // Return callback if there is no model
        if (_.isEmpty(strapi.models)) {
          return cb();
        }

        const connections = _.pickBy(strapi.config.connections, {
          connector: 'strapi-bookshelf'
        });

        const done = _.after(_.size(connections), () => {
          cb();
        });

        _.forEach(connections, (connection, connectionName) => {
          // Apply defaults
          _.defaults(connection.settings, strapi.hooks.bookshelf.defaults);

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
          if (_.get(connection, 'options.plugins') !== false) {
            ORM.plugin('visibility');
            ORM.plugin('pagination');
          }

          // Select models concerned by this connection
          const models = _.pickBy(strapi.models, {
            connection: connectionName
          });

          // Return callback if there is no model
          if (_.isEmpty(models)) {
            cb();

            // Break the loop.
            return false;
          }

          const loadedHook = _.after(_.size(models), () => {
            done();
          });

          // Parse every registered model.
          _.forEach(models, (definition, model) => {
            globalName = _.upperFirst(_.camelCase(definition.globalId));

            // Make sure the model has a table name.
            // If not, use the model name.
            if (_.isEmpty(definition.tableName)) {
              definition.tableName = model;
            }

            if (!_.isEmpty(definition.collectionName)) {
              return cb(
                'Attribute `collectionName` should be `tableName` in ' +
                  globalName +
                  ' model'
              );
            }

            // Add some informations about ORM & client connection
            definition.orm = 'bookshelf';
            definition.client = _.get(connection.settings, 'client');

            // Register the final model for Bookshelf.
            const loadedModel = _.assign(
              {
                tableName: definition.tableName,
                hasTimestamps: _.get(definition, 'options.timestamps') === true,
                idAttribute: _.get(definition, 'options.idAttribute') || 'id'
              },
              definition.options
            );

            if (_.isString(_.get(connection, 'options.pivot_prefix'))) {
              loadedModel.toJSON = function(options = {}) {
                const { shallow = false, omitPivot = false } = options;
                const attributes = this.serialize(options);

                if (!shallow) {
                  const pivot = this.pivot &&
                    !omitPivot &&
                    this.pivot.attributes;

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

            // Initialize the global variable with the
            // capitalized model name.
            global[globalName] = {};

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
                    fetched: 'afterFetch',
                    saving: 'beforeSave',
                    saved: 'afterSave'
                  };

                  _.forEach(lifecycle, (fn, key) => {
                    if (_.isFunction(strapi.models[model.toLowerCase()][fn])) {
                      this.on(key, strapi.models[model.toLowerCase()][fn]);
                    }
                  });

                  this.on('saving', (instance, attrs, options) => {
                    instance.attributes = mapper(instance.attributes);
                    attrs = mapper(attrs);

                    return _.isFunction(
                      strapi.models[model.toLowerCase()]['beforeSave']
                    )
                      ? strapi.models[model.toLowerCase()]['beforeSave']
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

                // loadedModel.save = function() {
                //
                //
                //   console.log('Attributes');
                //   console.log(this.attributes);
                //   console.log('Arguments');
                //   console.log(arguments);
                //   console.log('----------');
                //
                //   return ORM.Model.prototype.save.apply(this, arguments);
                // };

                global[globalName] = ORM.Model.extend(loadedModel);
                global[pluralize(globalName)] = ORM.Collection.extend({
                  model: global[globalName]
                });

                // Push model to strapi global variables.
                strapi.bookshelf.collections[globalName.toLowerCase()] = global[
                  globalName
                ];

                // Push attributes to be aware of model schema.
                strapi.bookshelf.collections[
                  globalName.toLowerCase()
                ]._attributes = definition.attributes;

                loadedHook();
              } catch (err) {
                strapi.log.error(
                  'Impossible to register the `' + model + '` model.'
                );
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
                utilsModels.getNature(details, name),
                'verbose'
              ) || '';

              // Build associations key
              if (!_.isEmpty(verbose)) {
                utilsModels.defineAssociations(
                  globalName,
                  definition,
                  details,
                  name
                );
              }

              switch (verbose) {
                case 'hasOne': {
                  const FK = _.findKey(
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

                  const globalId = _.get(
                    strapi.models,
                    `${details.model.toLowerCase()}.globalId`
                  );

                  loadedModel[name] = function() {
                    return this.hasOne(
                      global[globalId],
                      _.get(
                        strapi.models[details.model].attributes,
                        `${FK}.columnName`
                      ) || FK
                    );
                  };
                  break;
                }
                case 'hasMany': {
                  const globalId = _.get(
                    strapi.models,
                    `${details.collection.toLowerCase()}.globalId`
                  );
                  const FKTarget = _.get(
                    strapi.models[globalId.toLowerCase()].attributes,
                    `${details.via}.columnName`
                  ) || details.via;

                  loadedModel[name] = function() {
                    return this.hasMany(global[globalId], FKTarget);
                  };
                  break;
                }
                case 'belongsTo': {
                  const globalId = _.get(
                    strapi.models,
                    `${details.model.toLowerCase()}.globalId`
                  );

                  loadedModel[name] = function() {
                    return this.belongsTo(
                      global[globalId],
                      _.get(details, 'columnName') || name
                    );
                  };
                  break;
                }
                case 'belongsToMany': {
                  const tableName = _.get(details, 'tableName') ||
                    _.map(
                      _.sortBy(
                        [
                          strapi.models[details.collection].attributes[
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
                    strapi.models[details.collection].attributes[details.via]
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

                  loadedModel[name] = function() {
                    if (
                      _.isArray(_.get(details, 'withPivot')) &&
                      !_.isEmpty(details.withPivot)
                    ) {
                      return this.belongsToMany(
                        global[_.upperFirst(details.collection)],
                        tableName,
                        relationship.attribute + '_' + relationship.column,
                        details.attribute + '_' + details.column
                      ).withPivot(details.withPivot);
                    }

                    return this.belongsToMany(
                      global[_.upperFirst(details.collection)],
                      tableName,
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
        });
      });
    }
  };

  return hook;
};
