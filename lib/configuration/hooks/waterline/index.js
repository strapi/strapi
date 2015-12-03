'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const cluster = require('cluster');
const path = require('path');
const spawn = require('child_process').spawn;

// Public node modules.
const _ = require('lodash');
const async = require('async');
const Waterline = require('waterline');
const WaterlineGraphQL = require('waterline-graphql');

// Local utilities.
const helpers = require('./helpers/index');

/**
 * Waterline ORM hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      orm: {
        adapters: {
          disk: 'sails-disk'
        },
        defaultConnection: 'default',
        connections: {
          default: {
            adapter: 'disk',
            filePath: '.tmp/',
            fileName: 'default.db',
            migrate: 'alter'
          },
          permanent: {
            adapter: 'disk',
            filePath: './data/',
            fileName: 'permanent.db',
            migrate: 'alter'
          }
        }
      },
      globals: {
        models: true
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      if (_.isPlainObject(strapi.config.orm) && !_.isEmpty(strapi.config.orm) && (((cluster.isWorker && strapi.config.reload.workers > 0) || (cluster.isMaster && strapi.config.reload.workers < 1)) || !strapi.config.reload && cluster.isMaster)) {
        strapi.adapters = {};
        strapi.collections = [];

        // Expose a new instance of Waterline.
        if (!strapi.orm) {
          strapi.orm = new Waterline();
        }

        // Prefix every adapter and require them from the
        // `node_modules` directory of the application.
        _.forEach(strapi.config.orm.adapters, function (adapter, name) {
          try {
            strapi.adapters[name] = require(path.resolve(strapi.config.appPath, 'node_modules', adapter));
          } catch (err) {
            strapi.log.error('The adapter `' + adapter + '` is not installed.');
            process.exit(1);
          }
        });

        // Check if the adapter in every connections exists.
        _.forEach(strapi.config.orm.connections, function (settings, name) {
          if (!_.has(strapi.config.orm.adapters, settings.adapter)) {
            strapi.log.error('Unknown adapter `' + settings.adapter + '` for connection `' + name + '`.');
            process.exit(1);
          }
        });

        // Parse each models.
        _.forEach(strapi.models, function (definition, model) {
          _.bindAll(definition);

          // Make sure the model has a connection.
          // If not, use the default connection.
          if (_.isEmpty(definition.connection)) {
            definition.connection = strapi.config.orm.defaultConnection;
          }

          // Make sure this connection exists.
          if (!_.has(strapi.config.orm.connections, definition.connection)) {
            strapi.log.error('The connection `' + definition.connection + '` specified in the `' + model + '` model does not exist.');
            process.exit(1);
          }

          // Make sure this connection has an appropriate migrate strategy.
          // If not, use the appropriate strategy.
          if (!_.has(strapi.config.orm.connections[definition.connection], 'migrate')) {
            if (strapi.config.environment === 'production') {
              strapi.log.warn('Setting the migrate strategy of the `' + model + '` model to `safe`.');
              strapi.config.orm.connections[definition.connection].migrate = 'safe';
            } else {
              strapi.log.warn('Setting the migrate strategy of the `' + model + '` model to `alter`.');
              strapi.config.orm.connections[definition.connection].migrate = 'alter';
            }
          } else if (strapi.config.environment === 'production' && strapi.config.orm.connections[definition.connection].migrate === ('alter' || 'drop')) {
            strapi.log.warn('Setting the migrate strategy of the `' + model + '` model to `safe`.');
            strapi.config.orm.connections[definition.connection].migrate = 'safe';
          }

          // Apply the migrate strategy to the model.
          definition.migrate = strapi.config.orm.connections[definition.connection].migrate;

          // Derive information about this model's associations from its schema
          // and attach/expose the metadata as `SomeModel.associations` (an array).
          definition.associations = _.reduce(definition.attributes, function (associatedWith, attrDef, attrName) {
            if (typeof attrDef === 'object' && (attrDef.model || attrDef.collection)) {
              const assoc = {
                alias: attrName,
                type: attrDef.model ? 'model' : 'collection'
              };

              if (attrDef.model) {
                assoc.model = attrDef.model;
              }

              if (attrDef.collection) {
                assoc.collection = attrDef.collection;
              }

              if (attrDef.via) {
                assoc.via = attrDef.via;
              }

              associatedWith.push(assoc);
            }

            return associatedWith;
          }, []);

          // Finally, load the collection in the Waterline instance.
          try {
            const collection = strapi.orm.loadCollection(Waterline.Collection.extend(definition));

            if (_.isFunction(collection)) {
              strapi.collections.push(collection);
            }
          } catch (err) {
            strapi.log.error('Impossible to register the `' + model + '` model.');
            process.exit(1);
          }
        });

        // Finally, initialize the Waterline ORM and
        // globally expose models.
        strapi.orm.initialize({
          adapters: strapi.adapters,
          connections: strapi.config.orm.connections,
          collections: strapi.collections,
          defaults: {
            connection: strapi.config.orm.defaultConnection
          }
        }, function () {
          if (strapi.config.globals.models === true) {
            _.forEach(strapi.models, function (definition, model) {
              const globalName = _.capitalize(strapi.models[model].globalId);
              global[globalName] = strapi.orm.collections[model];
            });
          }

          // Parse each models and look for associations.
          _.forEach(strapi.orm.collections, function (definition, model) {
            _.forEach(definition.associations, function (association) {
              association.nature = helpers.getAssociationType(model, association);
            });
          });

          if (strapi.config.graphql.enabled === true) {
            // Parse each models and add associations array
            _.forEach(strapi.orm.collections, function (collection, key) {
              if (strapi.models.hasOwnProperty(key)) {
                collection.associations = strapi.models[key].associations || [];
              }
            });

            // Expose the GraphQL schemas at `strapi.schemas`
            WaterlineGraphQL.getGraphQLSchema({
              collections: strapi.orm.collections,
              usefulFunctions: true
            }, function (schemas) {
              strapi.schemas = schemas;

              strapi.emit('waterline:graphql:ready');
            });
          }

          cb();
        });
      } else {
        cb();
      }
    },

    /**
     * Reload the hook
     */

    reload: function () {
      hook.teardown(function () {
        delete strapi.orm;

        hook.initialize(function (err) {
          if (err) {
            strapi.log.error('Failed to reinitialize the ORM hook.');
            strapi.stop();
          } else {
            strapi.emit('hook:waterline:reloaded');
          }
        });
      });
    },

    /**
     * Teardown adapters
     */

    teardown: function (cb) {
      cb = cb || function (err) {
        if (err) {
          strapi.log.error('Failed to teardown ORM adapters.');
          strapi.stop();
        }
      };
      async.forEach(Object.keys(strapi.adapters || {}), function (name, next) {
        if (strapi.adapters[name].teardown) {
          strapi.adapters[name].teardown(null, next);
        } else {
          next();
        }
      }, cb);
    },

    /**
     * Installation adapters
     */

    installation: function () {
      const done = _.after(_.size(strapi.config.orm.adapters), function () {
        strapi.emit('hook:waterline:installed');
      });

      _.forEach(strapi.config.orm.adapters, function (adapter) {
        try {
          require(path.resolve(strapi.config.appPath, 'node_modules', adapter));

          done();
        } catch (err) {
          if (strapi.config.environment === 'development') {
            strapi.log.warn('Installing the `' + adapter + '` adapter, please wait...');
            console.log();

            const process = spawn('npm', ['install', adapter, '--save']);

            process.on('error', function (error) {
              strapi.log.error('The adapter `' + adapter + '` has not been installed.');
              strapi.log.error(error);
              process.exit(1);
            });

            process.on('close', function (code) {
              if (code !== 0) {
                strapi.log.error('The adapter `' + adapter + '` has not been installed.');
                strapi.log.error('Code: ' + code);
                process.exit(1);
              }

              strapi.log.info('`' + adapter + '` successfully installed');
              done();
            });
          } else {
            strapi.log.error('The adapter `' + adapter + '` is not installed.');
            strapi.log.error('Execute `$ npm install ' + adapter + ' --save` to install it.');
            process.exit(1);
          }
        }
      });
    }
  };

  return hook;
};
