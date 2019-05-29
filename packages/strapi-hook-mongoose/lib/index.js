'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const url = require('url');
const path = require('path');
const _ = require('lodash');
const mongoose = require('mongoose');
const Mongoose = mongoose.Mongoose;
const mongooseUtils = require('mongoose/lib/utils');

// Strapi helpers for models.
const { models: utilsModels } = require('strapi-utils');

// Local helpers.
const utils = require('./utils/');

const relations = require('./relations');
const buildQuery = require('./buildQuery');

/**
 * Mongoose hook
 */

/* eslint-disable prefer-template */
/* eslint-disable no-case-declarations */
/* eslint-disable no-const-assign */
/* eslint-disable no-unused-vars */
/* eslint-disable no-unexpected-multiline */
/* eslint-disable indent */
module.exports = function(strapi) {
  const hook = _.merge(
    {
      /**
       * Default options
       */

      defaults: {
        defaultConnection: 'default',
        host: 'localhost',
        port: 27017,
        database: 'strapi',
        authenticationDatabase: '',
        ssl: false,
        debug: false,
      },

      /**
       * Initialize the hook
       */

      initialize: cb =>
        _.forEach(
          _.pickBy(strapi.config.connections, {
            connector: 'strapi-hook-mongoose',
          }),
          async (connection, connectionName) => {
            const instance = new Mongoose();
            const {
              uri,
              host,
              port,
              username,
              password,
              database,
              srv,
            } = _.defaults(
              connection.settings,
              strapi.config.hook.settings.mongoose,
            );
            const uriOptions = uri ? url.parse(uri, true).query : {};
            const { authenticationDatabase, ssl, debug } = _.defaults(
              connection.options,
              uriOptions,
              strapi.config.hook.settings.mongoose,
            );
            const isSrv = srv === true || srv === 'true';

            // Connect to mongo database
            const connectOptions = {};
            const options = {
              useFindAndModify: false,
            };

            if (!_.isEmpty(username)) {
              connectOptions.user = username;

              if (!_.isEmpty(password)) {
                connectOptions.pass = password;
              }
            }

            if (!_.isEmpty(authenticationDatabase)) {
              connectOptions.authSource = authenticationDatabase;
            }

            connectOptions.ssl = ssl === true || ssl === 'true';
            connectOptions.useNewUrlParser = true;
            connectOptions.dbName = database;
            connectOptions.useCreateIndex = true;

            options.debug = debug === true || debug === 'true';

            try {
              /* FIXME: for now, mongoose doesn't support srv auth except the way including user/pass in URI.
               * https://github.com/Automattic/mongoose/issues/6881 */
              await instance.connect(
                uri ||
                  `mongodb${
                    isSrv ? '+srv' : ''
                  }://${username}:${password}@${host}${
                    !isSrv ? ':' + port : ''
                  }/`,
                connectOptions,
              );
            } catch ({ message }) {
              const errMsg = message.includes(`:${port}`)
                ? 'Make sure your MongoDB database is running...'
                : message;

              return cb(errMsg);
            }

            try {
              // Require `config/functions/mongoose.js` file to customize connection.
              require(path.resolve(
                strapi.config.appPath,
                'config',
                'functions',
                'mongoose.js',
              ))(instance, connection);
            } catch (err) {
              // This is not an error if the file is not found.
            }

            Object.keys(options, key => instance.set(key, options[key]));

            const mountModels = (models, target, plugin = false) => {
              if (!target) return;

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
                        association.nature.toLowerCase().indexOf('morph') !==
                        -1,
                    );

                    if (morphAssociations.length > 0) {
                      morphAssociations.forEach(association => {
                        Object.keys(preLifecycle)
                          .filter(key => key.indexOf('find') !== -1)
                          .forEach(key => {
                            collection.schema.pre(key, function(next) {
                              if (
                                this._mongooseOptions.populate &&
                                this._mongooseOptions.populate[
                                  association.alias
                                ]
                              ) {
                                if (
                                  association.nature === 'oneToManyMorph' ||
                                  association.nature === 'manyToManyMorph'
                                ) {
                                  this._mongooseOptions.populate[
                                    association.alias
                                  ].match = {
                                    [`${association.via}.${
                                      association.filter
                                    }`]: association.alias,
                                    [`${
                                      association.via
                                    }.kind`]: definition.globalId,
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
                                  this._mongooseOptions.populate[
                                    association.alias
                                  ] = {
                                    path: association.alias,
                                    match: {
                                      [`${association.via}.${
                                        association.filter
                                      }`]: association.alias,
                                      [`${
                                        association.via
                                      }.kind`]: definition.globalId,
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
                      },
                    );

                    // Use provided timestamps if the elemnets in the array are string else use default.
                    if (_.isArray(_.get(definition, 'options.timestamps'))) {
                      const timestamps = {
                        createdAt: _.isString(
                          _.get(definition, 'options.timestamps[0]'),
                        )
                          ? _.get(definition, 'options.timestamps[0]')
                          : 'createdAt',
                        updatedAt: _.isString(
                          _.get(definition, 'options.timestamps[1]'),
                        )
                          ? _.get(definition, 'options.timestamps[1]')
                          : 'updatedAt',
                      };
                      collection.schema.set('timestamps', timestamps);
                    } else {
                      collection.schema.set(
                        'timestamps',
                        _.get(definition, 'options.timestamps') === true,
                      );
                      _.set(
                        definition,
                        'options.timestamps',
                        _.get(definition, 'options.timestamps') === true
                          ? ['createdAt', 'updatedAt']
                          : false,
                      );
                    }
                    collection.schema.set(
                      'minimize',
                      _.get(definition, 'options.minimize', false) === true,
                    );

                    // Save all attributes (with timestamps)
                    target[model].allAttributes = _.clone(definition.attributes);

                    collection.schema.options.toObject = collection.schema.options.toJSON = {
                      virtuals: true,
                      transform: function(doc, returned, opts) {
                        // Remover $numberDecimal nested property.
                        Object.keys(returned)
                          .filter(
                            key =>
                              returned[key] instanceof
                              mongoose.Types.Decimal128,
                          )
                          .forEach((key, index) => {
                            // Parse to float number.
                            returned[key] = parseFloat(
                              returned[key].toString(),
                            );
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
                      definition.collectionName,
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
                    strapi.log.error(
                      'Impossible to register the `' + model + '` model.',
                    );
                    strapi.log.error(err);
                    strapi.stop();
                  }
                });
              });

              // Parse every authenticated model.
              _.forEach(models, (definition, model) => {
                definition.globalName = _.upperFirst(
                  _.camelCase(definition.globalId),
                );

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
                      '` model does not exist.',
                  );
                  strapi.stop();
                }

                // Add some informations about ORM & client connection
                definition.orm = 'mongoose';
                definition.client = _.get(
                  strapi.config.connections[definition.connection],
                  'client',
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
                    new instance.Schema({}),
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
                    }),
                  );

                  _.set(
                    strapi.config.hook.settings.mongoose,
                    'collections.' +
                      mongooseUtils.toCollectionName(definition.globalName) +
                      '.schema',
                    schema,
                  );

                  loadedAttributes();
                });

                // Add every relationships to the loaded model for Bookshelf.
                // Basic attributes don't need this-- only relations.
                _.forEach(definition.attributes, (details, name) => {
                  const verbose =
                    _.get(
                      utilsModels.getNature(
                        details,
                        name,
                        undefined,
                        model.toLowerCase(),
                      ),
                      'verbose',
                    ) || '';

                  // Build associations key
                  utilsModels.defineAssociations(
                    model.toLowerCase(),
                    definition,
                    details,
                    name,
                  );

                  if (_.isEmpty(verbose)) {
                    definition.loadedModel[name].type = utils(
                      instance,
                    ).convertType(details.type);
                  }

                  switch (verbose) {
                    case 'hasOne': {
                      const ref = details.plugin
                        ? strapi.plugins[details.plugin].models[details.model]
                            .globalId
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
                        ? strapi.plugins[details.plugin].models[
                            details.collection
                          ].globalId
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
                        ? strapi.plugins[details.plugin].models[details.model]
                            .globalId
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
                        ? strapi.plugins[details.plugin].models[
                            details.collection
                          ].globalId
                        : strapi.models[details.collection].globalId;

                      // One-side of the relationship has to be a virtual field to be bidirectional.
                      if (
                        (FK && _.isUndefined(FK.via)) ||
                        details.dominant !== true
                      ) {
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
                        ? strapi.plugins[details.plugin].models[details.model]
                            .globalId
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
                        ? strapi.plugins[details.plugin].models[
                            details.collection
                          ].globalId
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

            // Mount `./api` models.
            mountModels(
              _.pickBy(strapi.models, { connection: connectionName }),
              strapi.models,
            );

            // Mount `./admin` models.
            mountModels(
              _.pickBy(strapi.admin.models, { connection: connectionName }),
              strapi.admin.models,
            );

            // Mount `./plugins` models.
            _.forEach(strapi.plugins, (plugin, name) => {
              mountModels(
                _.pickBy(strapi.plugins[name].models, {
                  connection: connectionName,
                }),
                plugin.models,
                name,
              );
            });

            cb();
          },
        ),

      getQueryParams: (value, type, key) => {
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
            result.key = 'sort';
            result.value = _.toLower(value) === 'desc' ? '-' : '';
            result.value += key;
            break;
          case '_start':
            result.key = 'start';
            result.value = parseFloat(value);
            break;
          case '_limit':
            result.key = 'limit';
            result.value = parseFloat(value);
            break;
          case '_populate':
            result.key = 'populate';
            result.value = value;
            break;
          case '_contains':
            result.key = `where.${key}`;
            result.value = {
              $regex: value,
              $options: 'i',
            };
            break;
          case '_containss':
            result.key = `where.${key}.$regex`;
            result.value = value;
            break;
          case '_in':
            result.key = `where.${key}.$in`;
            result.value = _.castArray(value);
            break;
          case '_nin':
            result.key = `where.${key}.$nin`;
            result.value = _.castArray(value);
            break;
          default:
            result = undefined;
        }

        return result;
      },
      buildQuery,
    },
    relations,
  );

  return hook;
};
