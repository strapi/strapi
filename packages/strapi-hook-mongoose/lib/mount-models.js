'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const mongooseUtils = require('mongoose/lib/utils');

const utilsModels = require('strapi-utils').models;
const utils = require('./utils/');
const relations = require('./relations');

module.exports = ({ models, target, plugin = false }, ctx) => {
  const { instance } = ctx;

  const loadedAttributes = _.after(_.size(models), () => {
    _.forEach(models, (definition, model) => {
      try {
        let collection =
          strapi.config.hook.settings.mongoose.collections[
            mongooseUtils.toCollectionName(definition.globalName)
          ];

        // Set the default values to model settings.
        _.defaults(definition, {
          primaryKey: '_id',
        });

        // Initialize lifecycle callbacks.
        const preLifecycle = {
          validate: 'beforeCreate',
          findOneAndUpdate: 'beforeUpdate',
          findOneAndRemove: 'beforeDestroy',
          remove: 'beforeDestroy',
          update: 'beforeUpdate',
          updateOne: 'beforeUpdate',
          find: 'beforeFetchAll',
          findOne: 'beforeFetch',
          save: 'beforeSave',
        };

        /*
          Override populate path for polymorphic association.
          It allows us to make Upload.find().populate('related')
          instead of Upload.find().populate('related.item')
        */

        const morphAssociations = definition.associations.filter(
          association =>
            association.nature.toLowerCase().indexOf('morph') !== -1
        );

        if (morphAssociations.length > 0) {
          morphAssociations.forEach(association => {
            Object.keys(preLifecycle)
              .filter(key => key.indexOf('find') !== -1)
              .forEach(key => {
                collection.schema.pre(key, function(next) {
                  if (
                    this._mongooseOptions.populate &&
                    this._mongooseOptions.populate[association.alias]
                  ) {
                    if (
                      association.nature === 'oneToManyMorph' ||
                      association.nature === 'manyToManyMorph'
                    ) {
                      this._mongooseOptions.populate[
                        association.alias
                      ].match = {
                        [`${association.via}.${association.filter}`]: association.alias,
                        [`${association.via}.kind`]: definition.globalId,
                      };

                      // Select last related to an entity.
                      this._mongooseOptions.populate[
                        association.alias
                      ].options = {
                        sort: '-createdAt',
                      };
                    } else {
                      this._mongooseOptions.populate[
                        association.alias
                      ].path = `${association.alias}.ref`;
                    }
                  } else {
                    if (!this._mongooseOptions.populate) {
                      this._mongooseOptions.populate = {};
                    }

                    // Images are not displayed in populated data.
                    // We automatically populate morph relations.
                    if (
                      association.nature === 'oneToManyMorph' ||
                      association.nature === 'manyToManyMorph'
                    ) {
                      this._mongooseOptions.populate[association.alias] = {
                        path: association.alias,
                        match: {
                          [`${association.via}.${association.filter}`]: association.alias,
                          [`${association.via}.kind`]: definition.globalId,
                        },
                        options: {
                          sort: '-createdAt',
                        },
                        select: undefined,
                        model: undefined,
                        _docs: {},
                      };
                    }
                  }
                  next();
                });
              });
          });
        }

        _.forEach(preLifecycle, (fn, key) => {
          if (_.isFunction(target[model.toLowerCase()][fn])) {
            collection.schema.pre(key, function(next) {
              target[model.toLowerCase()]
                [fn](this)
                .then(next)
                .catch(err => strapi.log.error(err));
            });
          }
        });

        const postLifecycle = {
          validate: 'afterCreate',
          findOneAndRemove: 'afterDestroy',
          remove: 'afterDestroy',
          update: 'afterUpdate',
          updateOne: 'afterUpdate',
          find: 'afterFetchAll',
          findOne: 'afterFetch',
          save: 'afterSave',
        };

        // Mongoose doesn't allow post 'remove' event on model.
        // See https://github.com/Automattic/mongoose/issues/3054
        _.forEach(postLifecycle, (fn, key) => {
          if (_.isFunction(target[model.toLowerCase()][fn])) {
            collection.schema.post(key, function(doc, next) {
              target[model.toLowerCase()]
                [fn](this, doc)
                .then(next)
                .catch(err => {
                  strapi.log.error(err);
                  next(err);
                });
            });
          }
        });

        // Add virtual key to provide populate and reverse populate
        _.forEach(
          _.pickBy(definition.loadedModel, model => {
            return model.type === 'virtual';
          }),
          (value, key) => {
            collection.schema.virtual(key.replace('_v', ''), {
              ref: value.ref,
              localField: '_id',
              foreignField: value.via,
              justOne: value.justOne || false,
            });
          }
        );

        // Use provided timestamps if the elemnets in the array are string else use default.
        if (_.isArray(_.get(definition, 'options.timestamps'))) {
          const timestamps = {
            createdAt: _.isString(_.get(definition, 'options.timestamps[0]'))
              ? _.get(definition, 'options.timestamps[0]')
              : 'createdAt',
            updatedAt: _.isString(_.get(definition, 'options.timestamps[1]'))
              ? _.get(definition, 'options.timestamps[1]')
              : 'updatedAt',
          };
          collection.schema.set('timestamps', timestamps);
        } else {
          collection.schema.set(
            'timestamps',
            _.get(definition, 'options.timestamps') === true
          );
          _.set(
            definition,
            'options.timestamps',
            _.get(definition, 'options.timestamps') === true
              ? ['createdAt', 'updatedAt']
              : false
          );
        }
        collection.schema.set(
          'minimize',
          _.get(definition, 'options.minimize', false) === true
        );

        // Save all attributes (with timestamps)
        target[model].allAttributes = _.clone(definition.attributes);

        collection.schema.options.toObject = collection.schema.options.toJSON = {
          virtuals: true,
          transform: function(doc, returned) {
            // Remover $numberDecimal nested property.
            Object.keys(returned)
              .filter(key => returned[key] instanceof mongoose.Types.Decimal128)
              .forEach(key => {
                // Parse to float number.
                returned[key] = parseFloat(returned[key].toString());
              });

            morphAssociations.forEach(association => {
              if (
                Array.isArray(returned[association.alias]) &&
                returned[association.alias].length > 0
              ) {
                // Reformat data by bypassing the many-to-many relationship.
                switch (association.nature) {
                  case 'oneMorphToOne':
                    returned[association.alias] =
                      returned[association.alias][0].ref;
                    break;
                  case 'manyMorphToMany':
                  case 'manyMorphToOne':
                    returned[association.alias] = returned[
                      association.alias
                    ].map(obj => obj.ref);
                    break;
                  default:
                }
              }
            });
          },
        };

        // Instantiate model.
        const Model = instance.model(
          definition.globalId,
          collection.schema,
          definition.collectionName
        );

        if (!plugin) {
          global[definition.globalName] = Model;
        }

        // Expose ORM functions through the `target` object.
        target[model] = _.assign(Model, target[model]);

        // Push attributes to be aware of model schema.
        target[model]._attributes = definition.attributes;
        target[model].updateRelations = relations.update;
      } catch (err) {
        strapi.log.error('Impossible to register the `' + model + '` model.');
        strapi.log.error(err);
        strapi.stop();
      }
    });
  });

  // Parse every authenticated model.
  _.forEach(models, (definition, model) => {
    definition.globalName = _.upperFirst(_.camelCase(definition.globalId));

    // Make sure the model has a connection.
    // If not, use the default connection.
    if (_.isEmpty(definition.connection)) {
      definition.connection =
        strapi.config.currentEnvironment.database.defaultConnection;
    }

    // Make sure this connection exists.
    if (!_.has(strapi.config.connections, definition.connection)) {
      strapi.log.error(
        'The connection `' +
          definition.connection +
          '` specified in the `' +
          model +
          '` model does not exist.'
      );
      strapi.stop();
    }

    // Add some informations about ORM & client connection
    definition.orm = 'mongoose';
    definition.client = _.get(
      strapi.config.connections[definition.connection],
      'client'
    );
    definition.associations = [];

    // Register the final model for Mongoose.
    definition.loadedModel = _.cloneDeep(definition.attributes);

    // Initialize the global variable with the
    // capitalized model name.
    if (!plugin) {
      global[definition.globalName] = {};
    }

    if (_.isEmpty(definition.attributes)) {
      // Generate empty schema
      _.set(
        strapi.config.hook.settings.mongoose,
        'collections.' +
          mongooseUtils.toCollectionName(definition.globalName) +
          '.schema',
        new instance.Schema({})
      );

      return loadedAttributes();
    }

    // Call this callback function after we are done parsing
    // all attributes for relationships-- see below.
    const done = _.after(_.size(definition.attributes), () => {
      // Generate schema without virtual populate
      const schema = new instance.Schema(
        _.omitBy(definition.loadedModel, model => {
          return model.type === 'virtual';
        })
      );

      _.set(
        strapi.config.hook.settings.mongoose,
        'collections.' +
          mongooseUtils.toCollectionName(definition.globalName) +
          '.schema',
        schema
      );

      loadedAttributes();
    });

    // Add every relationships to the loaded model for Bookshelf.
    // Basic attributes don't need this-- only relations.
    _.forEach(definition.attributes, (details, name) => {
      const verbose =
        _.get(
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

      if (_.isEmpty(verbose)) {
        definition.loadedModel[name].type = utils(instance).convertType(
          details.type
        );
      }

      switch (verbose) {
        case 'hasOne': {
          const ref = details.plugin
            ? strapi.plugins[details.plugin].models[details.model].globalId
            : strapi.models[details.model].globalId;

          definition.loadedModel[name] = {
            type: instance.Schema.Types.ObjectId,
            ref,
          };
          break;
        }
        case 'hasMany': {
          const FK = _.find(definition.associations, {
            alias: name,
          });
          const ref = details.plugin
            ? strapi.plugins[details.plugin].models[details.collection].globalId
            : strapi.models[details.collection].globalId;

          if (FK) {
            definition.loadedModel[name] = {
              type: 'virtual',
              ref,
              via: FK.via,
              justOne: false,
            };

            // Set this info to be able to see if this field is a real database's field.
            details.isVirtual = true;
          } else {
            definition.loadedModel[name] = [
              {
                type: instance.Schema.Types.ObjectId,
                ref,
              },
            ];
          }
          break;
        }
        case 'belongsTo': {
          const FK = _.find(definition.associations, {
            alias: name,
          });
          const ref = details.plugin
            ? strapi.plugins[details.plugin].models[details.model].globalId
            : strapi.models[details.model].globalId;

          if (
            FK &&
            FK.nature !== 'oneToOne' &&
            FK.nature !== 'manyToOne' &&
            FK.nature !== 'oneWay' &&
            FK.nature !== 'oneToMorph'
          ) {
            definition.loadedModel[name] = {
              type: 'virtual',
              ref,
              via: FK.via,
              justOne: true,
            };

            // Set this info to be able to see if this field is a real database's field.
            details.isVirtual = true;
          } else {
            definition.loadedModel[name] = {
              type: instance.Schema.Types.ObjectId,
              ref,
            };
          }

          break;
        }
        case 'belongsToMany': {
          const FK = _.find(definition.associations, {
            alias: name,
          });
          const ref = details.plugin
            ? strapi.plugins[details.plugin].models[details.collection].globalId
            : strapi.models[details.collection].globalId;

          // One-side of the relationship has to be a virtual field to be bidirectional.
          if ((FK && _.isUndefined(FK.via)) || details.dominant !== true) {
            definition.loadedModel[name] = {
              type: 'virtual',
              ref,
              via: FK.via,
            };

            // Set this info to be able to see if this field is a real database's field.
            details.isVirtual = true;
          } else {
            definition.loadedModel[name] = [
              {
                type: instance.Schema.Types.ObjectId,
                ref,
              },
            ];
          }
          break;
        }
        case 'morphOne': {
          const FK = _.find(definition.associations, {
            alias: name,
          });
          const ref = details.plugin
            ? strapi.plugins[details.plugin].models[details.model].globalId
            : strapi.models[details.model].globalId;

          definition.loadedModel[name] = {
            type: 'virtual',
            ref,
            via: `${FK.via}.ref`,
            justOne: true,
          };

          // Set this info to be able to see if this field is a real database's field.
          details.isVirtual = true;
          break;
        }
        case 'morphMany': {
          const FK = _.find(definition.associations, {
            alias: name,
          });
          const ref = details.plugin
            ? strapi.plugins[details.plugin].models[details.collection].globalId
            : strapi.models[details.collection].globalId;

          definition.loadedModel[name] = {
            type: 'virtual',
            ref,
            via: `${FK.via}.ref`,
          };

          // Set this info to be able to see if this field is a real database's field.
          details.isVirtual = true;
          break;
        }
        case 'belongsToMorph': {
          definition.loadedModel[name] = {
            kind: String,
            [details.filter]: String,
            ref: {
              type: instance.Schema.Types.ObjectId,
              refPath: `${name}.kind`,
            },
          };
          break;
        }
        case 'belongsToManyMorph': {
          definition.loadedModel[name] = [
            {
              kind: String,
              [details.filter]: String,
              ref: {
                type: instance.Schema.Types.ObjectId,
                refPath: `${name}.kind`,
              },
            },
          ];
          break;
        }
        default:
          break;
      }

      done();
    });
  });
};
