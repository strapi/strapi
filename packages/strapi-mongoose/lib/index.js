'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const mongoose = require('mongoose');
const mongooseUtils = require('mongoose/lib/utils');

// Local helpers.
const utils = require('./utils/');

// Strapi helpers for models.
const utilsModels = require('strapi-utils').models;

/**
 * Bookshelf hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      defaultConnection: 'default',
      host: 'localhost',
      port: 27017,
      database: 'strapi'
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      let globalName;

      // Return callback if there is no model
      if (_.isEmpty(strapi.models) || _.pickBy(strapi.config.connections, {connector: 'strapi-mongoose'})) {
        return cb();
      }

      _.forEach(_.pickBy(strapi.config.connections, {connector: 'strapi-mongoose'}), (connection, connectionName) => {
        const {host, port, username, password, database} = _.defaults(connection.settings, strapi.hooks.mongoose.defaults);

        // Connect to mongo database
        if (_.isEmpty(username) || _.isEmpty(password)) {
          mongoose.connect(`mongodb://${host}:${port}/${database}`);
        } else {
          mongoose.connect(`mongodb://${username}:${password}@${host}:${port}/${database}`);
        }

        const db = mongoose.connection;

        // Handle error
        db.on('error', error => {
          cb(error);
        });

        // Handle success
        db.on('open', () => {
          // Initialize collections
          _.set(strapi, 'mongoose.collections', {});

          // Select models concerned by this connection
          const models = _.pickBy(strapi.models, {connection: connectionName});

          // Return callback if there is no model
          if (_.isEmpty(models)) {
            return cb();
          }

          const loadedAttributes = _.after(_.size(models), () => {
            _.forEach(models, (definition, model) => {
              try {
                let collection = strapi.mongoose.collections[mongooseUtils.toCollectionName(definition.globalName)];

                // Initialize lifecycle callbacks.
                const preLifecycle = {
                  validate: 'beforeCreate',
                  remove: 'beforeDestroy',
                  update: 'beforeUpdate',
                  find: 'beforeFetch',
                  save: 'beforeSave'
                };

                _.forEach(preLifecycle, (fn, key) => {
                  if (_.isFunction(strapi.models[model.toLowerCase()][fn])) {
                    collection.schema.pre(key, strapi.models[model.toLowerCase()][fn]);
                  }
                });

                const postLifecycle = {
                  validate: 'afterCreate',
                  remove: 'afterDestroy',
                  update: 'afterUpdate',
                  find: 'afterFetch',
                  save: 'afterSave'
                };

                _.forEach(postLifecycle, (fn, key) => {
                  if (_.isFunction(strapi.models[model.toLowerCase()][fn])) {
                    collection.schema.post(key, strapi.models[model.toLowerCase()][fn]);
                  }
                });

                // Add virtual key to provide populate and reverse populate
                _.forEach(_.pickBy(definition.loadedModel, model => {
                  return model.type === 'virtual';
                }), (value, key) => {
                  collection.schema.virtual(key.replace('_v', ''), {
                    ref: value.ref,
                    localField: '_id',
                    foreignField: value.via,
                    justOne: value.justOne || false
                  });
                });

                collection.schema.set('toObject', {
                  virtuals: true
                });

                collection.schema.set('toJSON', {
                  virtuals: true
                });

                global[definition.globalName] = mongoose.model(definition.globalName, collection.schema);

                // Push model to strapi global variables.
                collection = global[definition.globalName];

                // Push attributes to be aware of model schema.
                collection._attributes = definition.attributes;
              } catch (err) {
                strapi.log.error('Impossible to register the `' + model + '` model.');
                strapi.log.error(err);
                strapi.stop();
              }
            });

            cb();
          });

          // Parse every registered model.
          _.forEach(models, (definition, model) => {
            definition.globalName = _.upperFirst(_.camelCase(definition.globalId));

            // Make sure the model has a connection.
            // If not, use the default connection.
            if (_.isEmpty(definition.connection)) {
              definition.connection = strapi.config.defaultConnection;
            }

            // Make sure this connection exists.
            if (!_.has(strapi.config.connections, definition.connection)) {
              strapi.log.error('The connection `' + definition.connection + '` specified in the `' + model + '` model does not exist.');
              strapi.stop();
            }

            // Add some informations about ORM & client connection
            definition.orm = 'mongoose';
            definition.client = _.get(strapi.config.connections[definition.connection], 'client');

            // Register the final model for Bookshelf.
            definition.loadedModel = _.cloneDeep(definition.attributes);

            // Initialize the global variable with the
            // capitalized model name.
            global[definition.globalName] = {};

            if (_.isEmpty(definition.attributes)) {
              // Generate empty schema
              _.set(strapi.mongoose.collections, mongooseUtils.toCollectionName(definition.globalName) + '.schema', new mongoose.Schema({}));

              return loadedAttributes();
            }

            // Call this callback function after we are done parsing
            // all attributes for relationships-- see below.
            const done = _.after(_.size(definition.attributes), () => {
              // Generate schema without virtual populate
              _.set(strapi.mongoose.collections, mongooseUtils.toCollectionName(definition.globalName) + '.schema', new mongoose.Schema(_.omitBy(definition.loadedModel, model => {
                return model.type === 'virtual';
              })));

              loadedAttributes();
            });

            // Add every relationships to the loaded model for Bookshelf.
            // Basic attributes don't need this-- only relations.
            _.forEach(definition.attributes, (details, name) => {
              const verbose = _.get(utilsModels.getNature(details, name), 'verbose') || '';

              // Build associations key
              if (!_.isEmpty(verbose)) {
                utilsModels.defineAssociations(globalName, definition, details, name);
              } else {
                definition.loadedModel[name].type = utils(mongoose).convertType(details.type);
              }

              let FK;

              switch (verbose) {
                case 'hasOne':
                  definition.loadedModel[name] = {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: _.capitalize(details.model)
                  };
                  break;
                case 'hasMany':
                  FK = _.find(definition.associations, {alias: name});

                  if (FK) {
                    definition.loadedModel[name] = {
                      type: 'virtual',
                      ref: _.capitalize(details.collection),
                      via: FK.via
                    };
                  } else {
                    definition.loadedModel[name] = [{
                      type: mongoose.Schema.Types.ObjectId,
                      ref: _.capitalize(details.collection)
                    }];
                  }
                  break;
                case 'belongsTo':
                  FK = _.find(definition.associations, {alias: name});

                  if (FK && FK.nature === 'oneToOne') {
                    definition.loadedModel[name] = {
                      type: 'virtual',
                      ref: _.capitalize(details.model),
                      via: FK.via,
                      justOne: true
                    };
                  } else {
                    definition.loadedModel[name] = {
                      type: mongoose.Schema.Types.ObjectId,
                      ref: _.capitalize(details.model)
                    };
                  }
                  break;
                case 'belongsToMany':
                  FK = _.find(definition.associations, {alias: name});

                  if (FK && _.isUndefined(details.via)) {
                    definition.loadedModel[name] = {
                      type: 'virtual',
                      ref: _.capitalize(FK.collection),
                      via: utilsModels.getVia(name, details)
                    };
                  } else {
                    definition.loadedModel[name] = [{
                      type: mongoose.Schema.Types.ObjectId,
                      ref: _.capitalize(details.collection)
                    }];
                  }
                  break;
                default:
                  break;
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
