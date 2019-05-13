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

// Strapi helpers for models.
const utilsModels = require('strapi-utils').models;

// Local helpers.
const utils = require('./utils/');
const relations = require('./relations');
const buildQuery = require('./buildQuery');
const buildDatabaseSchema = require('./buildDatabaseSchema');

const PIVOT_PREFIX = '_pivot_';
const GLOBALS = {};

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

/**
 * Bookshelf hook
 */

module.exports = function(strapi) {
  const hook = _.merge(
    {
      /**
       * Default options
       */

      defaults: {
        defaultConnection: 'default',
        host: 'localhost',
      },

      /**
       * Initialize the hook
       */

      initialize: async cb => {
        const connections = _.pickBy(strapi.config.connections, {
          connector: 'strapi-hook-bookshelf',
        });

        const databaseUpdates = [];

        _.forEach(connections, (connection, connectionName) => {
          // Apply defaults
          _.defaults(
            connection.settings,
            strapi.config.hook.settings.bookshelf
          );

          // Create Bookshelf instance for this connection.
          const ORM = new bookshelf(strapi.connections[connectionName]);

          try {
            // Require `config/functions/bookshelf.js` file to customize connection.
            require(path.resolve(
              strapi.config.appPath,
              'config',
              'functions',
              'bookshelf.js'
            ))(ORM, connection);
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
              definition.globalName = _.upperFirst(
                _.camelCase(definition.globalId)
              );
              definition.associations = [];

              // Define local GLOBALS to expose every models in this file.
              GLOBALS[definition.globalId] = {};

              // Add some informations about ORM & client connection & tableName
              definition.orm = 'bookshelf';
              definition.databaseName = getDatabaseName(connection);
              definition.client = _.get(connection.settings, 'client');
              _.defaults(definition, {
                primaryKey: 'id',
                primaryKeyType: _.get(
                  definition,
                  'options.idAttributeType',
                  'integer'
                ),
              });

              // Use default timestamp column names if value is `true`
              if (_.get(definition, 'options.timestamps', false) === true) {
                _.set(definition, 'options.timestamps', [
                  'created_at',
                  'updated_at',
                ]);
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
                  tableName: definition.collectionName,
                  hasTimestamps: _.get(definition, 'options.timestamps', false),
                  idAttribute: _.get(definition, 'options.idAttribute', 'id'),
                  associations: [],
                  defaults: Object.keys(definition.attributes).reduce(
                    (acc, current) => {
                      if (
                        definition.attributes[current].type &&
                        definition.attributes[current].default
                      ) {
                        acc[current] = definition.attributes[current].default;
                      }

                      return acc;
                    },
                    {}
                  ),
                },
                definition.options
              );

              if (_.isString(_.get(connection, 'options.pivot_prefix'))) {
                loadedModel.toJSON = function(options = {}) {
                  const { shallow = false, omitPivot = false } = options;
                  const attributes = this.serialize(options);

                  if (!shallow) {
                    const pivot =
                      this.pivot && !omitPivot && this.pivot.attributes;

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
              if (!plugin) {
                global[definition.globalName] = {};
              }

              // Call this callback function after we are done parsing
              // all attributes for relationships-- see below.
              const done = _.after(_.size(definition.attributes), () => {
                try {
                  // External function to map key that has been updated with `columnName`
                  const mapper = (params = {}) => {
                    if (
                      definition.client === 'mysql' ||
                      definition.client === 'sqlite3'
                    ) {
                      Object.keys(params).map(key => {
                        const attr = definition.attributes[key] || {};

                        if (attr.type === 'json') {
                          params[key] = JSON.stringify(params[key]);
                        }
                      });
                    }

                    return _.mapKeys(params, (value, key) => {
                      const attr = definition.attributes[key] || {};

                      return _.isPlainObject(attr) &&
                        _.isString(attr['columnName'])
                        ? attr['columnName']
                        : key;
                    });
                  };

                  // Update serialize to reformat data for polymorphic associations.
                  loadedModel.serialize = function(options) {
                    const attrs = _.clone(this.attributes);

                    if (options && options.shallow) {
                      return attrs;
                    }

                    const relations = this.relations;

                    // Extract association except polymorphic.
                    const associations = definition.associations.filter(
                      association =>
                        association.nature.toLowerCase().indexOf('morph') === -1
                    );
                    // Extract polymorphic association.
                    const polymorphicAssociations = definition.associations.filter(
                      association =>
                        association.nature.toLowerCase().indexOf('morph') !== -1
                    );

                    polymorphicAssociations.map(association => {
                      // Retrieve relation Bookshelf object.
                      const relation = relations[association.alias];

                      if (relation) {
                        // Extract raw JSON data.
                        attrs[association.alias] = relation.toJSON
                          ? relation.toJSON(options)
                          : relation;

                        // Retrieve opposite model.
                        const model = association.plugin
                          ? strapi.plugins[association.plugin].models[
                              association.collection || association.model
                            ]
                          : strapi.models[
                              association.collection || association.model
                            ];

                        // Reformat data by bypassing the many-to-many relationship.
                        switch (association.nature) {
                          case 'oneToManyMorph':
                            attrs[association.alias] =
                              attrs[association.alias][model.collectionName];
                            break;
                          case 'manyToManyMorph':
                            attrs[association.alias] = attrs[
                              association.alias
                            ].map(rel => rel[model.collectionName]);
                            break;
                          case 'oneMorphToOne':
                            attrs[association.alias] =
                              attrs[association.alias].related;
                            break;
                          case 'manyMorphToOne':
                          case 'manyMorphToMany':
                            attrs[association.alias] = attrs[
                              association.alias
                            ].map(obj => obj.related);
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
                    const lifecycle = {
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

                    _.forEach(lifecycle, (fn, key) => {
                      if (_.isFunction(target[model.toLowerCase()][fn])) {
                        this.on(key, target[model.toLowerCase()][fn]);
                      }
                    });

                    const findModelByAssoc = ({ assoc }) => {
                      return assoc.plugin
                        ? strapi.plugins[assoc.plugin].models[
                            assoc.collection || assoc.model
                          ]
                        : strapi.models[assoc.collection || assoc.model];
                    };

                    const isPolymorphic = ({ assoc }) => {
                      return assoc.nature.toLowerCase().indexOf('morph') !== -1;
                    };

                    const formatPolymorphicPopulate = ({
                      assoc,
                      path,
                      prefix = '',
                    }) => {
                      if (_.isString(path) && path === assoc.via) {
                        return `related.${assoc.via}`;
                      } else if (_.isString(path) && path === assoc.alias) {
                        // MorphTo side.
                        if (assoc.related) {
                          return `${prefix}${assoc.alias}.related`;
                        }

                        // oneToMorph or manyToMorph side.
                        // Retrieve collection name because we are using it to build our hidden model.
                        const model = findModelByAssoc({ assoc });

                        return {
                          [`${prefix}${assoc.alias}.${
                            model.collectionName
                          }`]: function(query) {
                            query.orderBy('created_at', 'desc');
                          },
                        };
                      }
                    };

                    // Update withRelated level to bypass many-to-many association for polymorphic relationshiips.
                    // Apply only during fetching.
                    this.on(
                      'fetching fetching:collection',
                      (instance, attrs, options) => {
                        if (_.isArray(options.withRelated)) {
                          options.withRelated = options.withRelated
                            .map(path => {
                              const assoc = definition.associations.find(
                                assoc =>
                                  assoc.alias === path || assoc.via === path
                              );

                              if (assoc && isPolymorphic({ assoc })) {
                                return formatPolymorphicPopulate({
                                  assoc,
                                  path,
                                });
                              }

                              let extraAssocs = [];
                              if (assoc) {
                                const assocModel = findModelByAssoc({ assoc });

                                extraAssocs = assocModel.associations
                                  .filter(assoc => isPolymorphic({ assoc }))
                                  .map(assoc =>
                                    formatPolymorphicPopulate({
                                      assoc,
                                      path: assoc.alias,
                                      prefix: `${path}.`,
                                    })
                                  );
                              }

                              return [path, ...extraAssocs];
                            })
                            .reduce((acc, paths) => acc.concat(paths), []);
                        }

                        return _.isFunction(
                          target[model.toLowerCase()]['beforeFetchAll']
                        )
                          ? target[model.toLowerCase()]['beforeFetchAll']
                          : Promise.resolve();
                      }
                    );

                    //eslint-disable-next-line
                    this.on('saving', (instance, attrs, options) => {
                      instance.attributes = mapper(instance.attributes);
                      attrs = mapper(attrs);

                      return _.isFunction(
                        target[model.toLowerCase()]['beforeSave']
                      )
                        ? target[model.toLowerCase()]['beforeSave']
                        : Promise.resolve();
                    });

                    // Convert to JSON format stringify json for mysql database
                    if (
                      definition.client === 'mysql' ||
                      definition.client === 'sqlite3'
                    ) {
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

                      const jsonFormatter = attributes => {
                        Object.keys(attributes).map(key => {
                          const attr = definition.attributes[key] || {};

                          if (attr.type === 'json') {
                            attributes[key] = JSON.parse(attributes[key]);
                          }
                        });
                      };

                      events.forEach(event => {
                        let fn;

                        if (event.name.indexOf('collection') !== -1) {
                          fn = instance =>
                            instance.models.map(entry => {
                              jsonFormatter(entry.attributes);
                            });
                        } else {
                          fn = instance => jsonFormatter(instance.attributes);
                        }

                        this.on(event.name, instance => {
                          fn(instance);

                          return _.isFunction(
                            target[model.toLowerCase()][event.target]
                          )
                            ? target[model.toLowerCase()][event.target]
                            : Promise.resolve();
                        });
                      });
                    }
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
                  target[model] = _.assign(
                    GLOBALS[definition.globalId],
                    target[model]
                  );

                  // Push attributes to be aware of model schema.
                  target[model]._attributes = definition.attributes;
                  target[model].updateRelations = relations.update;

                  databaseUpdates.push(
                    buildDatabaseSchema({
                      ORM,
                      definition,
                      loadedModel,
                      connection,
                      model: target[model],
                    })
                  );
                } catch (err) {
                  strapi.log.error(
                    `Impossible to register the '${model}' model.`
                  );
                  strapi.log.error(err);
                  strapi.stop();
                }
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
                      model.toLowerCase()
                    ),
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
                  globalId = details.plugin
                    ? _.get(
                        strapi.plugins,
                        `${
                          details.plugin
                        }.models.${globalName.toLowerCase()}.globalId`
                      )
                    : _.get(
                        strapi.models,
                        `${globalName.toLowerCase()}.globalId`
                      );
                }

                switch (verbose) {
                  case 'hasOne': {
                    const FK = details.plugin
                      ? _.findKey(
                          strapi.plugins[details.plugin].models[details.model]
                            .attributes,
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
                        )
                      : _.findKey(
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

                    const columnName = details.plugin
                      ? _.get(
                          strapi.plugins,
                          `${details.plugin}.models.${
                            details.model
                          }.attributes.${FK}.columnName`,
                          FK
                        )
                      : _.get(
                          strapi.models,
                          `${details.model}.attributes.${FK}.columnName`,
                          FK
                        );

                    loadedModel[name] = function() {
                      return this.hasOne(GLOBALS[globalId], columnName);
                    };
                    break;
                  }
                  case 'hasMany': {
                    const columnName = details.plugin
                      ? _.get(
                          strapi.plugins,
                          `${
                            details.plugin
                          }.models.${globalId.toLowerCase()}.attributes.${
                            details.via
                          }.columnName`,
                          details.via
                        )
                      : _.get(
                          strapi.models[globalId.toLowerCase()].attributes,
                          `${details.via}.columnName`,
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
                    const collection = details.plugin
                      ? strapi.plugins[details.plugin].models[
                          details.collection
                        ]
                      : strapi.models[details.collection];

                    const collectionName =
                      _.get(details, 'collectionName') ||
                      utilsModels.getCollectionName(
                        collection.attributes[details.via],
                        details
                      );

                    const relationship = collection.attributes[details.via];

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
                      `${details.attribute}_${details.column}` ===
                      `${relationship.attribute}_${relationship.column}`
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
                          `${relationship.attribute}_${relationship.column}`,
                          `${details.attribute}_${details.column}`
                        ).withPivot(details.withPivot);
                      }

                      return this.belongsToMany(
                        GLOBALS[globalId],
                        collectionName,
                        `${relationship.attribute}_${relationship.column}`,
                        `${details.attribute}_${details.column}`
                      );
                    };
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
                          _.get(
                            model,
                            `attributes.${details.via}.filter`,
                            'field'
                          ),
                          name
                        );
                      });
                    };
                    break;
                  }
                  case 'morphMany': {
                    const collection = details.plugin
                      ? strapi.plugins[details.plugin].models[
                          details.collection
                        ]
                      : strapi.models[details.collection];

                    const globalId = `${collection.collectionName}_morph`;

                    loadedModel[name] = function() {
                      return this.morphMany(
                        GLOBALS[globalId],
                        details.via,
                        `${definition.collectionName}`
                      ).query(qb => {
                        qb.where(
                          _.get(
                            collection,
                            `attributes.${details.via}.filter`,
                            'field'
                          ),
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
                        models = Object.keys(strapi.plugins).reduce(
                          (acc, current) => {
                            const models = Object.values(
                              strapi.plugins[current].models
                            ).filter(model => model.globalId === id);

                            if (acc.length === 0 && models.length > 0) {
                              acc = models;
                            }

                            return acc;
                          },
                          []
                        );
                      }

                      if (models.length === 0) {
                        strapi.log.error(
                          `Impossible to register the '${model}' model.`
                        );
                        strapi.log.error(
                          'The collection name cannot be found for the morphTo method.'
                        );
                        strapi.stop();
                      }

                      return models[0].collectionName;
                    });

                    // Define new model.
                    const options = {
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
                done();
              });

              if (_.isEmpty(definition.attributes)) {
                done();
              }
            });
          };

          // Mount `./api` models.
          mountModels(
            _.pickBy(strapi.models, { connection: connectionName }),
            strapi.models
          );

          // Mount `./admin` models.
          mountModels(
            _.pickBy(strapi.admin.models, { connection: connectionName }),
            strapi.admin.models
          );

          // Mount `./plugins` models.
          _.forEach(strapi.plugins, (plugin, name) => {
            mountModels(
              _.pickBy(strapi.plugins[name].models, {
                connection: connectionName,
              }),
              plugin.models,
              name
            );
          });
        });

        return Promise.all(databaseUpdates).then(() => cb(), cb);
      },

      getQueryParams: (value, type, key) => {
        const result = {};

        switch (type) {
          case '=':
            result.key = `where.${key}`;
            result.value = {
              symbol: '=',
              value,
            };
            break;
          case '_ne':
            result.key = `where.${key}`;
            result.value = {
              symbol: '!=',
              value,
            };
            break;
          case '_lt':
            result.key = `where.${key}`;
            result.value = {
              symbol: '<',
              value,
            };
            break;
          case '_gt':
            result.key = `where.${key}`;
            result.value = {
              symbol: '>',
              value,
            };
            break;
          case '_lte':
            result.key = `where.${key}`;
            result.value = {
              symbol: '<=',
              value,
            };
            break;
          case '_gte':
            result.key = `where.${key}`;
            result.value = {
              symbol: '>=',
              value,
            };
            break;
          case '_sort':
            result.key = 'sort';
            result.value = {
              key,
              order: value.toUpperCase(),
            };
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
          case '_containss':
            result.key = `where.${key}`;
            result.value = {
              symbol: 'like',
              value: `%${value}%`,
            };
            break;
          case '_in':
            result.key = `where.${key}`;
            result.value = {
              symbol: 'IN',
              value: _.castArray(value),
            };
            break;
          case '_nin':
            result.key = `where.${key}`;
            result.value = {
              symbol: 'NOT IN',
              value: _.castArray(value),
            };
            break;
          default:
            return undefined;
        }

        return result;
      },
      buildQuery,
    },
    relations
  );

  return hook;
};
