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

const PIVOT_PREFIX = '_pivot_';
const GLOBALS = {};

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

        const databaseUpdate = [];

        _.forEach(connections, (connection, connectionName) => {
          // Apply defaults
          _.defaults(connection.settings, strapi.config.hook.settings.bookshelf);

          // Create Bookshelf instance for this connection.
          const ORM = new bookshelf(strapi.connections[connectionName]);

          try {
            // Require `config/functions/bookshelf.js` file to customize connection.
            require(path.resolve(strapi.config.appPath, 'config', 'functions', 'bookshelf.js'))(
              ORM,
              connection
            );
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

              // Define local GLOBALS to expose every models in this file.
              GLOBALS[definition.globalId] = {};

              // Add some informations about ORM & client connection & tableName
              definition.orm = 'bookshelf';
              definition.databaseName = _.get(connection.settings, 'database');
              definition.client = _.get(connection.settings, 'client');
              _.defaults(definition, {
                primaryKey: 'id',
                primaryKeyType: _.get(definition, 'options.idAttributeType', 'integer'),
              });

              // Use default timestamp column names if value is `true`
              if (_.get(definition, 'options.timestamps', false) === true) {
                _.set(definition, 'options.timestamps', ['created_at', 'updated_at']);
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
                  defaults: Object.keys(definition.attributes).reduce((acc, current) => {
                    if (
                      definition.attributes[current].type &&
                      definition.attributes[current].default
                    ) {
                      acc[current] = definition.attributes[current].default;
                    }

                    return acc;
                  }, {}),
                },
                definition.options
              );

              if (_.isString(_.get(connection, 'options.pivot_prefix'))) {
                loadedModel.toJSON = function(options = {}) {
                  const { shallow = false, omitPivot = false } = options;
                  const attributes = this.serialize(options);

                  if (!shallow) {
                    const pivot = this.pivot && !omitPivot && this.pivot.attributes;

                    // Remove pivot attributes with prefix.
                    _.keys(pivot).forEach(key => delete attributes[`${PIVOT_PREFIX}${key}`]);

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
                    if (definition.client === 'mysql' || definition.client === 'sqlite3') {
                      Object.keys(params).map(key => {
                        const attr = definition.attributes[key] || {};

                        if (attr.type === 'json') {
                          params[key] = JSON.stringify(params[key]);
                        }
                      });
                    }

                    return _.mapKeys(params, (value, key) => {
                      const attr = definition.attributes[key] || {};

                      return _.isPlainObject(attr) && _.isString(attr['columnName'])
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
                      association => association.nature.toLowerCase().indexOf('morph') === -1
                    );
                    // Extract polymorphic association.
                    const polymorphicAssociations = definition.associations.filter(
                      association => association.nature.toLowerCase().indexOf('morph') !== -1
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
                          : strapi.models[association.collection || association.model];

                        // Reformat data by bypassing the many-to-many relationship.
                        switch (association.nature) {
                          case 'oneToManyMorph':
                            attrs[association.alias] =
                              attrs[association.alias][model.collectionName];
                            break;
                          case 'manyToManyMorph':
                            attrs[association.alias] = attrs[association.alias].map(
                              rel => rel[model.collectionName]
                            );
                            break;
                          case 'oneMorphToOne':
                            attrs[association.alias] = attrs[association.alias].related;
                            break;
                          case 'manyMorphToOne':
                          case 'manyMorphToMany':
                            attrs[association.alias] = attrs[association.alias].map(
                              obj => obj.related
                            );
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
                        ? strapi.plugins[assoc.plugin].models[assoc.collection || assoc.model]
                        : strapi.models[assoc.collection || assoc.model];
                    };

                    const isPolymorphic = ({ assoc }) => {
                      return assoc.nature.toLowerCase().indexOf('morph') !== -1;
                    };

                    const formatPolymorphicPopulate = ({ assoc, path, prefix = '' }) => {
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
                          [`${prefix}${assoc.alias}.${model.collectionName}`]: function(query) {
                            query.orderBy('created_at', 'desc');
                          },
                        };
                      }
                    };

                    // Update withRelated level to bypass many-to-many association for polymorphic relationshiips.
                    // Apply only during fetching.
                    this.on('fetching fetching:collection', (instance, attrs, options) => {
                      if (_.isArray(options.withRelated)) {
                        options.withRelated = options.withRelated
                          .map(path => {
                            const assoc = definition.associations.find(
                              assoc => assoc.alias === path || assoc.via === path
                            );

                            if (assoc && isPolymorphic({ assoc })) {
                              return formatPolymorphicPopulate({ assoc, path });
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

                      return _.isFunction(target[model.toLowerCase()]['beforeFetchAll'])
                        ? target[model.toLowerCase()]['beforeFetchAll']
                        : Promise.resolve();
                    });

                    //eslint-disable-next-line
                    this.on('saving', (instance, attrs, options) => {
                      instance.attributes = mapper(instance.attributes);
                      attrs = mapper(attrs);

                      return _.isFunction(target[model.toLowerCase()]['beforeSave'])
                        ? target[model.toLowerCase()]['beforeSave']
                        : Promise.resolve();
                    });

                    // Convert to JSON format stringify json for mysql database
                    if (definition.client === 'mysql' || definition.client === 'sqlite3') {
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

                          return _.isFunction(target[model.toLowerCase()][event.target])
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
                  target[model] = _.assign(GLOBALS[definition.globalId], target[model]);

                  // Push attributes to be aware of model schema.
                  target[model]._attributes = definition.attributes;
                  target[model].updateRelations = relations.update;

                  databaseUpdate.push(
                    new Promise(async (resolve, reject) => {
                      try {
                        // Equilize database tables
                        const handler = async (table, attributes) => {
                          const tableExist = await ORM.knex.schema.hasTable(table);

                          /**
                           *
                           * @param {*} attribute
                           * @param {*} name
                           * @param {*} isTableExist Used to determine queries that cant be run while ALTERing TABLE
                           */
                          const getType = (attribute, name, isTableExist = false) => {
                            let type;

                            if (!attribute.type) {
                              // Add integer value if there is a relation
                              const relation = definition.associations.find(association => {
                                return association.alias === name;
                              });

                              switch (relation.nature) {
                                case 'oneToOne':
                                case 'manyToOne':
                                case 'oneWay':
                                  type = definition.primaryKeyType;
                                  break;
                                default:
                                  return null;
                              }
                            } else {
                              switch (attribute.type) {
                                case 'uuid':
                                  type = definition.client === 'pg' ? 'uuid' : 'varchar(36)';
                                  break;
                                case 'text':
                                  type = definition.client === 'pg' ? 'text' : 'longtext';
                                  break;
                                case 'json':
                                  type = definition.client === 'pg' ? 'jsonb' : 'longtext';
                                  break;
                                case 'string':
                                case 'enumeration':
                                case 'password':
                                case 'email':
                                  type = 'varchar(255)';
                                  break;
                                case 'integer':
                                  type = definition.client === 'pg' ? 'integer' : 'int';
                                  break;
                                case 'biginteger':
                                  type = definition.client === 'pg' ? 'bigint' : 'bigint(53)';
                                  break;
                                case 'float':
                                  type = definition.client === 'pg' ? 'double precision' : 'double';
                                  break;
                                case 'decimal':
                                  type = 'decimal(10,2)';
                                  break;
                                case 'date':
                                case 'time':
                                case 'datetime':
                                case 'timestamp':
                                  type =
                                    definition.client === 'pg'
                                      ? 'timestamp with time zone'
                                      : definition.client === 'sqlite3' && isTableExist
                                        ? 'timestamp DEFAULT NULL'
                                        : 'timestamp DEFAULT CURRENT_TIMESTAMP';
                                  break;
                                case 'timestampUpdate':
                                  switch (definition.client) {
                                    case 'pg':
                                      type = 'timestamp with time zone';
                                      break;
                                    case 'sqlite3':
                                      type = 'timestamp DEFAULT CURRENT_TIMESTAMP';
                                      break;
                                    default:
                                      type =
                                        'timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP';
                                      break;
                                  }
                                  break;
                                case 'boolean':
                                  type = 'boolean';
                                  break;
                                default:
                              }
                            }

                            return type;
                          };

                          // Apply field type of attributes definition
                          const generateColumns = (attrs, start, isTableExist = false) => {
                            return Object.keys(attrs).reduce((acc, attr) => {
                              const attribute = attributes[attr];

                              const type = getType(attribute, attr, isTableExist);

                              if (type) {
                                acc.push(
                                  `${quote}${attr}${quote} ${type} ${
                                    attribute.required ? 'NOT' : ''
                                  } NULL `
                                );
                              }

                              return acc;
                            }, start);
                          };

                          const generateIndexes = async table => {
                            try {
                              const connection = strapi.config.connections[definition.connection];
                              let columns = Object.keys(attributes).filter(attribute =>
                                ['string', 'text'].includes(attributes[attribute].type)
                              );

                              if (!columns.length) {
                                // No text columns founds, exit from creating Fulltext Index
                                return;
                              }

                              switch (connection.settings.client) {
                                case 'mysql':
                                  columns = columns.map(attribute => `\`${attribute}\``).join(',');

                                  // Create fulltext indexes for every column.
                                  await ORM.knex.raw(
                                    `CREATE FULLTEXT INDEX SEARCH_${_.toUpper(
                                      _.snakeCase(table)
                                    )} ON \`${table}\` (${columns})`
                                  );
                                  break;
                                case 'pg': {
                                  // Enable extension to allow GIN indexes.
                                  await ORM.knex.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

                                  // Create GIN indexes for every column.
                                  const indexes = columns.map(column => {
                                    const indexName = `${_.snakeCase(table)}_${column}`;
                                    const attribute =
                                      _.toLower(column) === column ? column : `"${column}"`;

                                    return ORM.knex.raw(
                                      `CREATE INDEX IF NOT EXISTS search_${_.toLower(
                                        indexName
                                      )} ON "${table}" USING gin(${attribute} gin_trgm_ops)`
                                    );
                                  });

                                  await Promise.all(indexes);
                                  break;
                                }
                              }
                            } catch (e) {
                              // Handle duplicate errors.
                              if (e.errno !== 1061 && e.code !== '42P07') {
                                if (_.get(connection, 'options.debug') === true) {
                                  console.log(e);
                                }

                                strapi.log.warn(
                                  'The SQL database indexes haven\'t been generated successfully. Please enable the debug mode for more details.'
                                );
                              }
                            }
                          };

                          const storeTable = async (table, attributes) => {
                            const existTable = await StrapiConfigs.forge({
                              key: `db_model_${table}`,
                            }).fetch();

                            if (existTable) {
                              await StrapiConfigs.forge({ id: existTable.id }).save({
                                value: JSON.stringify(attributes),
                              });
                            } else {
                              await StrapiConfigs.forge({
                                key: `db_model_${table}`,
                                type: 'object',
                                value: JSON.stringify(attributes),
                              }).save();
                            }
                          };

                          const createTable = async table => {
                            const defaultAttributeDifinitions = {
                              mysql: ['id INT AUTO_INCREMENT NOT NULL PRIMARY KEY'],
                              pg: ['id SERIAL NOT NULL PRIMARY KEY'],
                              sqlite3: ['id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL'],
                            };
                            let idAttributeBuilder = defaultAttributeDifinitions[definition.client];
                            if (
                              definition.primaryKeyType === 'uuid' &&
                              definition.client === 'pg'
                            ) {
                              idAttributeBuilder = [
                                'id uuid NOT NULL DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY',
                              ];
                            } else if (definition.primaryKeyType !== 'integer') {
                              idAttributeBuilder = [
                                `id ${getType({
                                  type: definition.primaryKeyType,
                                })} NOT NULL PRIMARY KEY`,
                              ];
                            }
                            const columns = generateColumns(attributes, idAttributeBuilder).join(
                              ',\n\r'
                            );
                            // Create table
                            await ORM.knex.raw(`
                        CREATE TABLE ${quote}${table}${quote} (
                          ${columns}
                        )
                      `);
                          };

                          if (!tableExist) {
                            await createTable(table);

                            // Generate indexes.
                            await generateIndexes(table, attributes);

                            await storeTable(table, attributes);
                          } else {
                            const columns = Object.keys(attributes);

                            // Fetch existing column
                            const columnsExist = await Promise.all(
                              columns.map(attribute => ORM.knex.schema.hasColumn(table, attribute))
                            );

                            const columnsToAdd = {};

                            // Get columns to add
                            columnsExist.forEach((columnExist, index) => {
                              const attribute = attributes[columns[index]];

                              if (!columnExist) {
                                columnsToAdd[columns[index]] = attribute;
                              }
                            });

                            // Generate indexes for new attributes.
                            await generateIndexes(table, columnsToAdd);

                            let previousAttributes;
                            try {
                              previousAttributes = JSON.parse(
                                (await StrapiConfigs.forge({
                                  key: `db_model_${table}`,
                                }).fetch()).toJSON().value
                              );
                            } catch (err) {
                              await storeTable(table, attributes);
                              previousAttributes = JSON.parse(
                                (await StrapiConfigs.forge({
                                  key: `db_model_${table}`,
                                }).fetch()).toJSON().value
                              );
                            }

                            // Generate and execute query to add missing column
                            if (Object.keys(columnsToAdd).length > 0) {
                              const columns = generateColumns(columnsToAdd, [], tableExist);
                              const queries = columns.reduce((acc, attribute) => {
                                acc.push(`ALTER TABLE ${quote}${table}${quote} ADD ${attribute};`);
                                return acc;
                              }, []);

                              await Promise.all(queries.map(query => ORM.knex.raw(query)));
                            }

                            let sqlite3Change = false;

                            // Execute query to update column type
                            await Promise.all(
                              columns.map(
                                attribute =>
                                  new Promise(async resolve => {
                                    if (
                                      JSON.stringify(previousAttributes[attribute]) ===
                                      JSON.stringify(attributes[attribute])
                                    ) {
                                      return resolve();
                                    } else {
                                      sqlite3Change = true;
                                    }

                                    const type = getType(attributes[attribute], attribute);

                                    if (type && definition.client !== 'sqlite3') {
                                      const changeType =
                                        definition.client === 'pg'
                                          ? `ALTER COLUMN ${quote}${attribute}${quote} TYPE ${type} USING ${quote}${attribute}${quote}::${type}`
                                          : `CHANGE ${quote}${attribute}${quote} ${quote}${attribute}${quote} ${type} `;

                                      const changeRequired =
                                        definition.client === 'pg'
                                          ? `ALTER COLUMN ${quote}${attribute}${quote} ${
                                            attributes[attribute].required ? 'SET' : 'DROP'
                                          } NOT NULL`
                                          : `CHANGE ${quote}${attribute}${quote} ${quote}${attribute}${quote} ${type} ${
                                            attributes[attribute].required ? 'NOT' : ''
                                          } NULL`;

                                      await ORM.knex.raw(
                                        `ALTER TABLE ${quote}${table}${quote} ${changeType}`
                                      );
                                      await ORM.knex.raw(
                                        `ALTER TABLE ${quote}${table}${quote} ${changeRequired}`
                                      );
                                    }

                                    resolve();
                                  })
                              )
                            );

                            if (sqlite3Change && definition.client === 'sqlite3') {
                              await createTable(`tmp_${table}`);

                              try {
                                const attrs = Object.keys(attributes)
                                  .filter(attribute => getType(attributes[attribute], attribute))
                                  .join(' ,');
                                await ORM.knex.raw(
                                  `INSERT INTO ${quote}tmp_${table}${quote}(${attrs}) SELECT ${attrs} FROM ${quote}${table}${quote}`
                                );
                              } catch (err) {
                                console.log('Warning!');
                                console.log(
                                  'We can\'t migrate your data due to the following error.'
                                );
                                console.log();
                                console.log(err);
                                console.log();
                                console.log(
                                  `We created a new table "tmp_${table}" with your latest changes.`
                                );
                                console.log(
                                  `We suggest you manually migrate your data from "${table}" to "tmp_${table}" and then to DROP and RENAME the tables.`
                                );

                                return false;
                              }
                              await ORM.knex.raw(`DROP TABLE ${quote}${table}${quote}`);
                              await ORM.knex.raw(
                                `ALTER TABLE ${quote}tmp_${table}${quote} RENAME TO ${quote}${table}${quote}`
                              );

                              await generateIndexes(table, attributes);
                            }

                            await storeTable(table, attributes);
                          }
                        };

                        const quote = definition.client === 'pg' ? '"' : '`';

                        // Add created_at and updated_at field if timestamp option is true
                        if (loadedModel.hasTimestamps) {
                          definition.attributes[
                            _.isString(loadedModel.hasTimestamps[0])
                              ? loadedModel.hasTimestamps[0]
                              : 'created_at'
                          ] = {
                            type: 'timestamp',
                          };
                          definition.attributes[
                            _.isString(loadedModel.hasTimestamps[1])
                              ? loadedModel.hasTimestamps[1]
                              : 'updated_at'
                          ] = {
                            type: 'timestampUpdate',
                          };
                        }

                        // Equilize tables
                        if (connection.options && connection.options.autoMigration !== false) {
                          await handler(loadedModel.tableName, definition.attributes);
                        }

                        // Equilize polymorphic releations
                        const morphRelations = definition.associations.find(association => {
                          return association.nature.toLowerCase().includes('morphto');
                        });

                        if (morphRelations) {
                          const attributes = {
                            [`${loadedModel.tableName}_id`]: {
                              type: definition.primaryKeyType,
                            },
                            [`${morphRelations.alias}_id`]: {
                              type: definition.primaryKeyType,
                            },
                            [`${morphRelations.alias}_type`]: {
                              type: 'text',
                            },
                            [definition.attributes[morphRelations.alias].filter]: {
                              type: 'text',
                            },
                          };

                          if (connection.options && connection.options.autoMigration !== false) {
                            await handler(`${loadedModel.tableName}_morph`, attributes);
                          }
                        }

                        // Equilize many to many releations
                        const manyRelations = definition.associations.find(association => {
                          return association.nature === 'manyToMany';
                        });

                        if (manyRelations && manyRelations.dominant) {
                          const collection = manyRelations.plugin
                            ? strapi.plugins[manyRelations.plugin].models[manyRelations.collection]
                            : strapi.models[manyRelations.collection];

                          const attributes = {
                            [`${pluralize.singular(manyRelations.collection)}_id`]: {
                              type: definition.primaryKeyType,
                            },
                            [`${pluralize.singular(definition.globalId.toLowerCase())}_id`]: {
                              type: definition.primaryKeyType,
                            },
                          };

                          const table =
                            _.get(manyRelations, 'collectionName') ||
                            utilsModels.getCollectionName(
                              collection.attributes[manyRelations.via],
                              manyRelations
                            );

                          await handler(table, attributes);
                        }

                        // Remove from attributes (auto handled by bookshlef and not displayed on ctb)
                        if (loadedModel.hasTimestamps) {
                          delete definition.attributes[
                            _.isString(loadedModel.hasTimestamps[0])
                              ? loadedModel.hasTimestamps[0]
                              : 'created_at'
                          ];
                          delete definition.attributes[
                            _.isString(loadedModel.hasTimestamps[1])
                              ? loadedModel.hasTimestamps[1]
                              : 'updated_at'
                          ];
                        }

                        return resolve();
                      } catch (error) {
                        return reject(error);
                      }
                    })
                  );
                } catch (err) {
                  strapi.log.error(`Impossible to register the '${model}' model.`);
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
                const verbose =
                  _.get(
                    utilsModels.getNature(details, name, undefined, model.toLowerCase()),
                    'verbose'
                  ) || '';

                // Build associations key
                utilsModels.defineAssociations(model.toLowerCase(), definition, details, name);

                let globalId;
                const globalName = details.model || details.collection || '';

                // Exclude polymorphic association.
                if (globalName !== '*') {
                  globalId = details.plugin
                    ? _.get(
                      strapi.plugins,
                      `${details.plugin}.models.${globalName.toLowerCase()}.globalId`
                    )
                    : _.get(strapi.models, `${globalName.toLowerCase()}.globalId`);
                }

                switch (verbose) {
                  case 'hasOne': {
                    const FK = details.plugin
                      ? _.findKey(
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
                      )
                      : _.findKey(strapi.models[details.model].attributes, details => {
                        if (
                          details.hasOwnProperty('model') &&
                            details.model === model &&
                            details.hasOwnProperty('via') &&
                            details.via === name
                        ) {
                          return details;
                        }
                      });

                    const columnName = details.plugin
                      ? _.get(
                        strapi.plugins,
                        `${details.plugin}.models.${details.model}.attributes.${FK}.columnName`,
                        FK
                      )
                      : _.get(strapi.models, `${details.model}.attributes.${FK}.columnName`, FK);

                    loadedModel[name] = function() {
                      return this.hasOne(GLOBALS[globalId], columnName);
                    };
                    break;
                  }
                  case 'hasMany': {
                    const columnName = details.plugin
                      ? _.get(
                        strapi.plugins,
                        `${details.plugin}.models.${globalId.toLowerCase()}.attributes.${
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
                      return this.belongsTo(GLOBALS[globalId], _.get(details, 'columnName', name));
                    };
                    break;
                  }
                  case 'belongsToMany': {
                    const collection = details.plugin
                      ? strapi.plugins[details.plugin].models[details.collection]
                      : strapi.models[details.collection];

                    const collectionName =
                      _.get(details, 'collectionName') ||
                      utilsModels.getCollectionName(collection.attributes[details.via], details);

                    const relationship = _.clone(collection.attributes[details.via]);

                    // Force singular foreign key
                    relationship.attribute = pluralize.singular(relationship.collection);
                    details.attribute = pluralize.singular(details.collection);

                    // Define PK column
                    details.column = utils.getPK(model, strapi.models);
                    relationship.column = utils.getPK(details.collection, strapi.models);

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
                      if (_.isArray(_.get(details, 'withPivot')) && !_.isEmpty(details.withPivot)) {
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
                        qb.where(_.get(model, `attributes.${details.via}.filter`, 'field'), name);
                      });
                    };
                    break;
                  }
                  case 'morphMany': {
                    const collection = details.plugin
                      ? strapi.plugins[details.plugin].models[details.collection]
                      : strapi.models[details.collection];

                    const globalId = `${collection.collectionName}_morph`;

                    loadedModel[name] = function() {
                      return this.morphMany(
                        GLOBALS[globalId],
                        details.via,
                        `${definition.collectionName}`
                      ).query(qb => {
                        qb.where(
                          _.get(collection, `attributes.${details.via}.filter`, 'field'),
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
                        models = Object.keys(strapi.plugins).reduce((acc, current) => {
                          const models = Object.values(strapi.plugins[current].models).filter(
                            model => model.globalId === id
                          );

                          if (acc.length === 0 && models.length > 0) {
                            acc = models;
                          }

                          return acc;
                        }, []);
                      }

                      if (models.length === 0) {
                        strapi.log.error(`Impossible to register the '${model}' model.`);
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
            });
          };

          // Mount `./api` models.
          mountModels(_.pickBy(strapi.models, { connection: connectionName }), strapi.models);

          // Mount `./plugins` models.
          _.forEach(strapi.plugins, (plugin, name) => {
            mountModels(
              _.pickBy(strapi.plugins[name].models, { connection: connectionName }),
              plugin.models,
              name
            );
          });
        });

        return Promise.all(databaseUpdate).then(() => cb(), cb);
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
