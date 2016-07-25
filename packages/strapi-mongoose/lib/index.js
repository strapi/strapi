'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const mongoose = require('mongoose');
const pluralize = require('pluralize');

// Local helpers.
const utils = require('./utils/');

// Strapi helpers for models.
const utilsModels = require('strapi/lib/configuration/hooks/models/utils/');

/**
 * Bookshelf hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      defaultConnection: 'default'
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      let globalName;

      // Return callback if there is no model
      if (_.isEmpty(strapi.models)) {
        return cb();
      }

      // Connect to mongo database
      mongoose.connect('mongodb://localhost/test');

      const db = mongoose.connection;

      // Handle error
      db.on('error', error => {
        cb(error);
      });

      // Handle success
      db.on('open', () => {
        // Initialize collections
        _.set(strapi, 'mongoose.collections', {});

        const loadedHook = _.after(_.size(strapi.models), function () {
          cb();
        });

        // Parse every registered model.
        _.forEach(strapi.models, function (definition, model) {
          globalName = _.capitalize(definition.globalId);

          // Make sure the model has a table name.
          // If not, use the model name.
          if (_.isEmpty(definition.collectionName)) {
            definition.collectionName = model;
          }

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
          const loadedModel = definition.attributes;

          // Initialize the global variable with the
          // capitalized model name.
          global[globalName] = {};

          // Call this callback function after we are done parsing
          // all attributes for relationships-- see below.
          const done = _.after(_.size(definition.attributes), function () {
            try {
              // Initialize lifecycle callbacks.
              // loadedModel.initialize = function () {
              //   const self = this;
              //   const lifecycle = {
              //     creating: 'beforeCreate',
              //     created: 'afterCreate',
              //     destroying: 'beforeDestroy',
              //     destroyed: 'afterDestroy',
              //     updating: 'beforeUpdate',
              //     updated: 'afterUpdate',
              //     fetching: 'beforeFetch',
              //     fetched: 'afterFetch',
              //     saving: 'beforeSave',
              //     saved: 'afterSave'
              //   };
              //
              //   _.forEach(lifecycle, function (fn, key) {
              //     if (_.isFunction(strapi.models[model.toLowerCase()][fn])) {
              //       self.on(key, strapi.models[model.toLowerCase()][fn]);
              //     }
              //   });
              // };

              const schema = mongoose.Schema(loadedModel);

              global[globalName] = mongoose.model(globalName, schema);;

              // Push model to strapi global variables.
              strapi.mongoose.collections[globalName.toLowerCase()] = global[globalName];

              // Push attributes to be aware of model schema.
              strapi.mongoose.collections[globalName.toLowerCase()]._attributes = definition.attributes;

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
          _.forEach(definition.attributes, function (details, name) {
            const verbose = _.get(utilsModels.getNature(details, name), 'verbose') || '';

            // Build associations key
            if (!_.isEmpty(verbose)) {
              utilsModels.defineAssociations(globalName, definition, details, name);
            } else {
              loadedModel[name].type = utils(mongoose).convertType(details.type);
            }

            switch (verbose) {
              case 'hasOne':
                const FK = _.findKey(strapi.models[details.model].attributes, function (details) {
                  if (details.hasOwnProperty('model') && details.model === model && details.hasOwnProperty('via') && details.via === name) {
                    return details;
                  }
                });

                loadedModel[name] = {
                  type: mongoose.mongoose.Schema.Types.ObjectId,
                  ref: _.capitalize(details.model)
                };
                break;

              case 'hasMany':
                loadedModel[name] = [{
                  type: mongoose.Schema.Types.ObjectId,
                  ref: _.capitalize(details.collection)
                }];
                break;

              case 'belongsTo':
                loadedModel[name] = {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: _.capitalize(details.model)
                };
                break;

              case 'belongsToMany':
                loadedModel[name] = [{
                  type: mongoose.Schema.Types.ObjectId,
                  ref: _.capitalize(details.collection)
                }];
                break;

              default:
                break;
            }

            done();
          });
        });
      });
    }
  };

  return hook;
};
