'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const Mongoose = require('mongoose').Mongoose;
const mongooseUtils = require('mongoose/lib/utils');

// Local helpers.
const utils = require('./utils/');

// Strapi helpers for models.
const { models: utilsModels, logger }  = require('strapi-utils');

/**
 * Mongoose hook
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
      database: 'strapi',
      authenticationDatabase: '',
      ssl: false
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      _.forEach(_.pickBy(strapi.config.connections, {connector: 'strapi-mongoose'}), (connection, connectionName) => {
        const instance = new Mongoose();
        const { uri, host, port, username, password, database, authenticationDatabase, ssl } = _.defaults(connection.settings, strapi.config.hook.settings.mongoose);

        // Connect to mongo database
        const connectOptions = {}
        if (!_.isEmpty(username)) {
          connectOptions.user = username
          if (!_.isEmpty(password)) {
            connectOptions.pass = password
          }
        }
        if (!_.isEmpty(authenticationDatabase)) {
          connectOptions.authSource = authenticationDatabase;
        }
        connectOptions.ssl = ssl ? true : false;

        instance.connect(uri || `mongodb://${host}:${port}/${database}`, connectOptions);

        // Handle error
        instance.connection.on('error', error => {
          if (error.message.indexOf(`:${port}`)) {
            return cb('Make sure your MongoDB database is running...');
          }

          cb(error);
        });

        // Handle success
        instance.connection.on('open', () => {
          const mountModels = (models, target, plugin = false) => {
            if (!target) return;

            const loadedAttributes = _.after(_.size(models), () => {
              _.forEach(models, (definition, model) => {
                try {
                  let collection = strapi.config.hook.settings.mongoose.collections[mongooseUtils.toCollectionName(definition.globalName)];

                  // Set the default values to model settings.
                  _.defaults(definition, {
                    primaryKey: '_id'
                  });

                  // Initialize lifecycle callbacks.
                  const preLifecycle = {
                    validate: 'beforeCreate',
                    findOneAndUpdate: 'beforeUpdate',
                    findOneAndRemove: 'beforeDestroy',
                    remove: 'beforeDestroy',
                    update: 'beforeUpdate',
                    find: 'beforeFetchAll',
                    findOne: 'beforeFetch',
                    save: 'beforeSave'
                  };

                  /*
                    Override populate path for polymorphic association.

                    It allows us to make Upload.find().populate('related')
                    instead of Upload.find().populate('related.item')
                  */

                  const morphAssociations = definition.associations.filter(association => association.nature.toLowerCase().indexOf('morph') !== -1);

                  if (morphAssociations.length > 0) {
                    morphAssociations.forEach(association => {
                      Object.keys(preLifecycle)
                        .filter(key => key.indexOf('find') !== -1)
                        .forEach(key => {
                          collection.schema.pre(key,  function (next) {
                            if (this._mongooseOptions.populate && this._mongooseOptions.populate[association.alias]) {
                              if (association.nature === 'oneToManyMorph' || association.nature === 'manyToManyMorph') {
                                this._mongooseOptions.populate[association.alias].match = {
                                  [`${association.via}.${association.filter}`]: association.alias,
                                  [`${association.via}.kind`]: definition.globalId
                                }
                              } else {
                                this._mongooseOptions.populate[association.alias].path = `${association.alias}.ref`;
                              }
                            }
                            next();
                          });
                        });
                    });
                  }

                  _.forEach(preLifecycle, (fn, key) => {
                    if (_.isFunction(target[model.toLowerCase()][fn])) {
                      collection.schema.pre(key, function (next) {
                        target[model.toLowerCase()][fn](this).then(next).catch(err => strapi.log.error(err));
                      });
                    }
                  });

                  const postLifecycle = {
                    validate: 'afterCreate',
                    findOneAndRemove: 'afterDestroy',
                    remove: 'afterDestroy',
                    update: 'afterUpdate',
                    find: 'afterFetchAll',
                    findOne: 'afterFetch',
                    save: 'afterSave'
                  };

                  _.forEach(postLifecycle, (fn, key) => {
                    if (_.isFunction(target[model.toLowerCase()][fn])) {
                      collection.schema.post(key, function (doc, next) {
                        target[model.toLowerCase()][fn](this, doc).then(next).catch(err => strapi.log.error(err))
                      });
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

                  collection.schema.set('timestamps', _.get(definition, 'options.timestamps') === true);

                  collection.schema.options.toObject = collection.schema.options.toJSON = {
                    virtuals: true,
                    transform: function (doc, returned, opts) {
                      morphAssociations.forEach(association => {
                        console.log(association);
                        if (Array.isArray(returned[association.alias]) && returned[association.alias].length > 0) {
                          // Reformat data by bypassing the many-to-many relationship.
                          switch (association.nature) {
                            case 'oneMorphToOne':
                              returned[association.alias] = returned[association.alias][0].ref;
                              break;
                            case 'manyMorphToMany':
                            case 'manyMorphToOne':
                              returned[association.alias] = returned[association.alias].map(obj => obj.ref);
                              break;
                            default:

                          }
                        }
                      });
                    }
                  };

                  if (!plugin) {
                    global[definition.globalName] = instance.model(definition.globalId, collection.schema, definition.collectionName);
                  } else {
                    instance.model(definition.globalId, collection.schema, definition.collectionName);
                  }

                  // Expose ORM functions through the `target` object.
                  target[model] = _.assign(instance.model(definition.globalName), target[model]);

                  // Push model to strapi global variables.
                  collection = instance.model(definition.globalName, collection.schema);

                  // Push attributes to be aware of model schema.
                  target[model]._attributes = definition.attributes;
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
                definition.connection = strapi.config.currentEnvironment.database.defaultConnection;
              }

              // Make sure this connection exists.
              if (!_.has(strapi.config.connections, definition.connection)) {
                strapi.log.error('The connection `' + definition.connection + '` specified in the `' + model + '` model does not exist.');
                strapi.stop();
              }

              // Add some informations about ORM & client connection
              definition.orm = 'mongoose';
              definition.client = _.get(strapi.config.connections[definition.connection], 'client');
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
                _.set(strapi.config.hook.settings.mongoose, 'collections.' + mongooseUtils.toCollectionName(definition.globalName) + '.schema', new instance.Schema({}));

                return loadedAttributes();
              }

              // Call this callback function after we are done parsing
              // all attributes for relationships-- see below.
              const done = _.after(_.size(definition.attributes), () => {
                // Generate schema without virtual populate
                const schema = new instance.Schema(_.omitBy(definition.loadedModel, model => {
                  return model.type === 'virtual';
                }));

                _.set(strapi.config.hook.settings.mongoose, 'collections.' + mongooseUtils.toCollectionName(definition.globalName) + '.schema', schema);

                loadedAttributes();
              });

              // Add every relationships to the loaded model for Bookshelf.
              // Basic attributes don't need this-- only relations.
              _.forEach(definition.attributes, (details, name) => {
                const verbose = _.get(utilsModels.getNature(details, name, undefined, model.toLowerCase()), 'verbose') || '';

                // Build associations key
                utilsModels.defineAssociations(model.toLowerCase(), definition, details, name);

                if (_.isEmpty(verbose)) {
                  definition.loadedModel[name].type = utils(instance).convertType(details.type);
                }

                switch (verbose) {
                  case 'hasOne': {
                    const ref = details.plugin ? strapi.plugins[details.plugin].models[details.model].globalId : strapi.models[details.model].globalId;

                    definition.loadedModel[name] = {
                      type: instance.Schema.Types.ObjectId,
                      ref
                    };
                    break;
                  }
                  case 'hasMany': {
                    const FK = _.find(definition.associations, {alias: name});
                    const ref = details.plugin ? strapi.plugins[details.plugin].models[details.collection].globalId : strapi.models[details.collection].globalId;

                    if (FK) {
                      definition.loadedModel[name] = {
                        type: 'virtual',
                        ref,
                        via: FK.via,
                        justOne: false
                      };

                      // Set this info to be able to see if this field is a real database's field.
                      details.isVirtual = true;
                    } else {
                      definition.loadedModel[name] = [{
                        type: instance.Schema.Types.ObjectId,
                        ref
                      }];
                    }
                    break;
                  }
                  case 'belongsTo': {
                    const FK = _.find(definition.associations, {alias: name});
                    const ref = details.plugin ? strapi.plugins[details.plugin].models[details.model].globalId : strapi.models[details.model].globalId;

                    if (FK && FK.nature !== 'oneToOne' && FK.nature !== 'manyToOne' && FK.nature !== 'oneWay' && FK.nature !== 'oneToMorph') {
                      definition.loadedModel[name] = {
                        type: 'virtual',
                        ref,
                        via: FK.via,
                        justOne: true
                      };

                      // Set this info to be able to see if this field is a real database's field.
                      details.isVirtual = true;
                    } else {
                      definition.loadedModel[name] = {
                        type: instance.Schema.Types.ObjectId,
                        ref
                      };
                    }

                    break;
                  }
                  case 'belongsToMany': {
                    const FK = _.find(definition.associations, {alias: name});
                    const ref = details.plugin ? strapi.plugins[details.plugin].models[details.collection].globalId : strapi.models[details.collection].globalId;

                    // One-side of the relationship has to be a virtual field to be bidirectional.
                    if ((FK && _.isUndefined(FK.via)) || details.dominant !== true) {
                      definition.loadedModel[name] = {
                        type: 'virtual',
                        ref,
                        via: FK.via
                      };

                      // Set this info to be able to see if this field is a real database's field.
                      details.isVirtual = true;
                    } else {
                      definition.loadedModel[name] = [{
                        type: instance.Schema.Types.ObjectId,
                        ref
                      }];
                    }
                    break;
                  }
                  case 'morphOne': {
                    const FK = _.find(definition.associations, {alias: name});
                    const ref = details.plugin ? strapi.plugins[details.plugin].models[details.model].globalId : strapi.models[details.model].globalId;

                    definition.loadedModel[name] = {
                      type: 'virtual',
                      ref,
                      via: `${FK.via}.ref`,
                      justOne: true
                    };

                    // Set this info to be able to see if this field is a real database's field.
                    details.isVirtual = true;
                    break;
                  }
                  case 'morphMany': {
                    const FK = _.find(definition.associations, {alias: name});
                    const ref = details.plugin ? strapi.plugins[details.plugin].models[details.collection].globalId : strapi.models[details.collection].globalId;

                    definition.loadedModel[name] = {
                      type: 'virtual',
                      ref,
                      via: `${FK.via}.ref`
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
                        refPath: `${name}.kind`
                      }
                    };
                    break;
                  }
                  case 'belongsToManyMorph': {
                    definition.loadedModel[name] = [{
                      kind: String,
                      [details.filter]: String,
                      ref: {
                        type: instance.Schema.Types.ObjectId,
                        refPath: `${name}.kind`
                      }
                    }];
                    break;
                  }
                  default:
                    break;
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

          cb();
        });
      });
    },

    getQueryParams: (value, type, key) => {
      const result = {};

      switch (type) {
        case '=':
          result.key = `where.${key}`;
          result.value = value;
          break;
        case '_ne':
          result.key = `where.${key}.$ne`;
          result.value = value;
          break;
        case '_lt':
          result.key = `where.${key}.$lt`;
          result.value = value;
          break;
        case '_gt':
          result.key = `where.${key}.$gt`;
          result.value = value;
          break;
        case '_lte':
          result.key = `where.${key}.$lte`;
          result.value = value;
          break;
        case '_gte':
          result.key = `where.${key}.$gte`;
          result.value = value;
          break;
        case '_sort':
          result.key = `sort`;
          result.value = (_.toLower(value) === 'desc') ? '-' : '';
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
        case '_contains':
          result.key = `where.${key}.$regex`;
          result.value = value;
          break;
        default:
          result = undefined;
      }

      return result;
    },

    manageRelations: async function (model, params, source) {
      const models = _.assign(_.clone(strapi.models), Object.keys(strapi.plugins).reduce((acc, current) => {
        _.assign(acc, strapi.plugins[current].models);
        return acc;
      }, {}));

      const Model = models[model];

      const virtualFields = [];
      const response = await Model
        .findOne({
          [Model.primaryKey]: params._id || params.id
        })
        .populate(_.keys(_.groupBy(_.reject(Model.associations, {autoPopulate: false}), 'alias')).join(' '));

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

                const recordId = _.isNull(params.values[current]) ? value[Model.primaryKey] || value.id || value._id : value[current];

                if (response[current] && _.isObject(response[current]) && response[current][Model.primaryKey] !== value[current]) {
                  virtualFields.push(
                    this.manageRelations(details.model || details.collection, {
                      _id: response[current][Model.primaryKey],
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
                    .findOne({ id : recordId })
                    .populate(_.keys(_.groupBy(_.reject(models[details.model || details.collection].associations, {autoPopulate: false}), 'alias')).join(' '))
                    .then(record => {
                      if (record && _.isObject(record[details.via]) && record[details.via][current] !== value[current]) {
                        return this.manageRelations(details.model || details.collection, {
                          id: record[details.via][Model.primaryKey] || record[details.via].id,
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

                acc[current] = _.isNull(params.values[current]) ? null : value[current];
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
                  ((typeof a === 'string') ? a : a[Model.primaryKey].toString()) === b[Model.primaryKey].toString()
                );
                // Records to remove in the relation.
                const toRemove = _.differenceWith(response[current], params.values[current], (a, b) =>
                  a[Model.primaryKey].toString() === ((typeof b === 'string') ? b : b[Model.primaryKey].toString())
                )
                  .filter(x => toAdd.find(y => x.id === y.id) === undefined);

                // Push the work into the flow process.
                toAdd.forEach(value => {
                  value = (typeof value === 'string') ? { _id: value } : value;

                  if (association.nature === 'manyToMany' && !_.isArray(params.values[Model.primaryKey])) {
                    value[details.via] = (value[details.via] || []).concat([response[Model.primaryKey]]);
                  } else {
                    value[details.via] = params[Model.primaryKey];
                  }

                  virtualFields.push(this.manageRelations(details.model || details.collection, {
                    id: value[Model.primaryKey] || value.id || value._id,
                    values: value,
                    foreignKey: current
                  }));
                });

                toRemove.forEach(value => {
                  value = (typeof value === 'string') ? { _id: value } : value;

                  if (association.nature === 'manyToMany' && !_.isArray(params.values[Model.primaryKey])) {
                    value[details.via] = value[details.via].filter(x => x.toString() !== response[Model.primaryKey].toString());
                  } else {
                    value[details.via] = null;
                  }

                  virtualFields.push(this.manageRelations(details.model || details.collection, {
                    id: value[Model.primaryKey] || value.id || value._id,
                    values: value,
                    foreignKey: current
                  }));
                });
              } else if (_.get(Model._attributes, `${current}.isVirtual`) !== true) {
                acc[current] = params.values[current];
              }

              break;
            case 'manyMorphToMany':
            case 'manyMorphToOne':
              // Update the relational array.
              acc[current] = params.values[current].map(obj => {
                const globalId = obj.source && obj.source !== 'content-manager' ?
                  strapi.plugins[obj.source].models[obj.ref].globalId:
                  strapi.models[obj.ref].globalId;

                // Define the object stored in database.
                // The shape is this object is defined by the strapi-mongoose connector.
                return {
                  ref: obj.refId,
                  kind: globalId,
                  [association.filter]: obj.field
                }
              });
              break;
            case 'oneToManyMorph':
            case 'manyToManyMorph':
              const transformToArrayID = (array) => {
                if (_.isArray(array)) {
                  return array.map(value => {
                    if (_.isObject(value)) {
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

              // Remove relations in the other side.
              toAdd.forEach(id => {
                virtualFields.push(this.addRelationMorph(details.model || details.collection, {
                  id,
                  alias: association.via,
                  ref: Model.globalId,
                  refId: response._id,
                  field: association.alias
                }, details.plugin));
              });

              // Remove relations in the other side.
              toRemove.forEach(id => {
                virtualFields.push(this.removeRelationMorph(details.model || details.collection, {
                  id,
                  alias: association.via,
                  ref: Model.globalId,
                  refId: response._id,
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

      virtualFields.push(Model
        .update({
          [Model.primaryKey]: params[Model.primaryKey] || params.id
        }, values, {
          strict: false
        }));

      // Update virtuals fields.
      const process = await Promise.all(virtualFields);

      return process[process.length - 1];
    },

    addRelationMorph: async function (model, params, source) {
      const models = _.assign(_.clone(strapi.models), Object.keys(strapi.plugins).reduce((acc, current) => {
        _.assign(acc, strapi.plugins[current].models);
        return acc;
      }, {}));

      const Model = models[model];
      /*
        TODO:
        Test this part because it has been coded during the development of the upload feature.
        However the upload doesn't need this method. It only uses the `removeRelationMorph`.
      */

      const entry = await Model.findOne({
        [Model.primaryKey]: params.id
      });
      const value = entry[params.alias] || [];

      // Retrieve association.
      const association = Model.associations.find(association => association.via === params.alias)[0];

      if (!association) {
        throw Error(`Impossible to create relationship with ${params.ref} (${params.refId})`);
      }

      // Resolve if the association is already existing.
      const isExisting = entry[params.alias].find(obj => {
        if (obj.kind === params.ref && obj.ref.toString() === params.refId.toString() && obj.field === params.field) {
          return true;
        }

        return false;
      });

      // Avoid duplicate.
      if (isExisting) {
        return Promise.resolve();
      }

      // Push new relation to the association array.
      value.push({
        ref: params.refId,
        kind: params.ref,
        field: association.filter
      });

      entry[params.alias] = value;

      return Model.update({
        [Model.primaryKey]: params.id
      }, entry, {
        strict: false
      });
    },

    removeRelationMorph: async function (model, params, source) {
      const models = _.assign(_.clone(strapi.models), Object.keys(strapi.plugins).reduce((acc, current) => {
        _.assign(acc, strapi.plugins[current].models);
        return acc;
      }, {}));

      const Model = models[model];

      const entry = await Model.findOne({
        [Model.primaryKey]: params.id
      });

      // Filter the association array and remove the association.
      entry[params.alias] = entry[params.alias].filter(obj => {
        if (obj.kind === params.ref && obj.ref.toString() === params.refId.toString() && obj.field === params.field) {
          return false;
        }

        return true;
      });

      return Model.update({
        [Model.primaryKey]: params.id
      }, entry, {
        strict: false
      });
    }
  };

  return hook;
};
