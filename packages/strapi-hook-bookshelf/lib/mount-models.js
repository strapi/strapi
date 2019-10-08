'use strict';
const _ = require('lodash');
const { singular } = require('pluralize');
const dateFns = require('date-fns');

const utilsModels = require('strapi-utils').models;
const relations = require('./relations');
const buildDatabaseSchema = require('./buildDatabaseSchema');
const {
  createGroupJoinTables,
  createGroupModels,
} = require('./generate-group-relations');

const PIVOT_PREFIX = '_pivot_';

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

module.exports = ({ models, target, plugin = false }, ctx) => {
  const { GLOBALS, connection, ORM } = ctx;

  // Parse every authenticated model.
  const updates = Object.keys(models).map(async model => {
    const definition = models[model];
    definition.globalName = _.upperFirst(_.camelCase(definition.globalId));
    definition.associations = [];

    // Define local GLOBALS to expose every models in this file.
    GLOBALS[definition.globalId] = {};

    // Add some information about ORM & client connection & tableName
    definition.orm = 'bookshelf';
    definition.databaseName = getDatabaseName(connection);
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

    const groupAttributes = Object.keys(definition.attributes).filter(
      key => definition.attributes[key].type === 'group'
    );

    if (_.isString(_.get(connection, 'options.pivot_prefix'))) {
      loadedModel.toJSON = function(options = {}) {
        const { shallow = false, omitPivot = false } = options;
        const attributes = this.serialize(options);

        if (!shallow) {
          const pivot = this.pivot && !omitPivot && this.pivot.attributes;

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

    await createGroupModels({ model: loadedModel, definition, ORM, GLOBALS });

    // Add every relationships to the loaded model for Bookshelf.
    // Basic attributes don't need this-- only relations.
    Object.keys(definition.attributes).forEach(name => {
      const details = definition.attributes[name];
      if (details.type !== undefined) {
        return;
      }

      const { nature, verbose } =
        utilsModels.getNature(details, name, undefined, model.toLowerCase()) ||
        {};

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
              `${details.plugin}.models.${globalName.toLowerCase()}.globalId`
            )
          : _.get(strapi.models, `${globalName.toLowerCase()}.globalId`);
      }

      switch (verbose) {
        case 'hasOne': {
          const target = details.plugin
            ? strapi.plugins[details.plugin].models[details.model]
            : strapi.models[details.model];

          const FK = _.findKey(target.attributes, details => {
            if (
              _.has(details, 'model') &&
              details.model === model &&
              _.has(details, 'via') &&
              details.via === name
            ) {
              return details;
            }
          });

          const columnName = _.get(target.attributes, [FK, 'columnName'], FK);

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
          const targetModel = details.plugin
            ? strapi.plugins[details.plugin].models[details.collection]
            : strapi.models[details.collection];

          // Force singular foreign key
          details.attribute = singular(details.collection);
          details.column = targetModel.primaryKey;

          // Set this info to be able to see if this field is a real database's field.
          details.isVirtual = true;

          if (nature === 'manyWay') {
            const joinTableName = `${definition.collectionName}__${_.snakeCase(
              name
            )}`;

            const foreignKey = `${singular(definition.collectionName)}_${
              definition.primaryKey
            }`;

            const otherKey = `${details.attribute}_${details.column}`;

            loadedModel[name] = function() {
              const targetBookshelfModel = GLOBALS[globalId];
              let collection = this.belongsToMany(
                targetBookshelfModel,
                joinTableName,
                foreignKey,
                otherKey
              );

              if (Array.isArray(details.withPivot)) {
                return collection.withPivot(details.withPivot);
              }

              return collection;
            };
          } else {
            const joinTableName =
              _.get(details, 'collectionName') ||
              utilsModels.getCollectionName(
                targetModel.attributes[details.via],
                details
              );

            const relationship = targetModel.attributes[details.via];

            // Define PK column
            relationship.attribute = singular(relationship.collection);
            relationship.column = definition.primaryKey;

            // Sometimes the many-to-many relationships
            // is on the same keys on the same models (ex: `friends` key in model `User`)
            if (
              `${details.attribute}_${details.column}` ===
              `${relationship.attribute}_${relationship.column}`
            ) {
              relationship.attribute = singular(details.via);
            }

            loadedModel[name] = function() {
              const targetBookshelfModel = GLOBALS[globalId];

              const foreignKey = `${relationship.attribute}_${relationship.column}`;
              const otherKey = `${details.attribute}_${details.column}`;

              let collection = this.belongsToMany(
                targetBookshelfModel,
                joinTableName,
                foreignKey,
                otherKey
              );

              if (Array.isArray(details.withPivot)) {
                return collection.withPivot(details.withPivot);
              }

              return collection;
            };
          }

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
                _.get(model, `attributes.${details.via}.filter`, 'field'),
                name
              );
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
              models = Object.values(strapi.groups).filter(
                model => model.globalId === id
              );
            }

            if (models.length === 0) {
              models = Object.keys(strapi.plugins).reduce((acc, current) => {
                const models = Object.values(
                  strapi.plugins[current].models
                ).filter(model => model.globalId === id);

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
    });

    // Call this callback function after we are done parsing
    // all attributes for relationships-- see below.

    try {
      // External function to map key that has been updated with `columnName`
      const mapper = (params = {}) => {
        Object.keys(params).map(key => {
          const attr = definition.attributes[key] || {};
          params[key] = castValueFromType(attr.type, params[key], definition);
        });

        return _.mapKeys(params, (value, key) => {
          const attr = definition.attributes[key] || {};

          return _.isPlainObject(attr) && _.isString(attr['columnName'])
            ? attr['columnName']
            : key;
        });
      };

      // Extract association except polymorphic.
      const associations = definition.associations.filter(
        association => association.nature.toLowerCase().indexOf('morph') === -1
      );
      // Extract polymorphic association.
      const polymorphicAssociations = definition.associations.filter(
        association => association.nature.toLowerCase().indexOf('morph') !== -1
      );

      // Update serialize to reformat data for polymorphic associations.
      loadedModel.serialize = function(options) {
        const attrs = _.clone(this.attributes);

        if (options && options.shallow) {
          return attrs;
        }

        const relations = this.relations;

        groupAttributes.forEach(key => {
          const { repeatable } = definition.attributes[key];
          if (relations[key]) {
            const groups = relations[key].toJSON().map(el => el.group);

            attrs[key] = repeatable === true ? groups : _.first(groups) || null;
          }
        });

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
                  attrs[association.alias][model.collectionName] || null;
                break;
              case 'manyToManyMorph':
                attrs[association.alias] = attrs[association.alias].map(
                  rel => rel[model.collectionName]
                );
                break;
              case 'oneMorphToOne':
                attrs[association.alias] =
                  attrs[association.alias].related || null;
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

      const findModelByAssoc = ({ assoc }) => {
        const target = assoc.collection || assoc.model;
        return assoc.plugin === 'admin'
          ? strapi.admin.models[target]
          : assoc.plugin
          ? strapi.plugins[assoc.plugin].models[target]
          : strapi.models[target];
      };

      const isPolymorphic = ({ assoc }) => {
        return assoc.nature.toLowerCase().indexOf('morph') !== -1;
      };

      const formatPolymorphicPopulate = ({ assoc, path, prefix = '' }) => {
        if (_.isString(path) && path === assoc.via) {
          return { [`related.${assoc.via}`]: () => {} };
        } else if (_.isString(path) && path === assoc.alias) {
          // MorphTo side.
          if (assoc.related) {
            return { [`${prefix}${assoc.alias}.related`]: () => {} };
          }

          // oneToMorph or manyToMorph side.
          // Retrieve collection name because we are using it to build our hidden model.
          const model = findModelByAssoc({ assoc });

          return {
            [`${prefix}${assoc.alias}.${model.collectionName}`]: function(
              query
            ) {
              query.orderBy('created_at', 'desc');
            },
          };
        }
      };

      const createAssociationPopulate = () => {
        return definition.associations
          .filter(ast => ast.autoPopulate !== false)
          .map(assoc => {
            if (isPolymorphic({ assoc })) {
              return formatPolymorphicPopulate({
                assoc,
                path: assoc.alias,
              });
            }

            let path = assoc.alias;
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

            return [assoc.alias, ...extraAssocs];
          })
          .reduce((acc, val) => acc.concat(val), []);
      };

      const populateGroup = key => {
        let paths = [];
        const group = strapi.groups[definition.attributes[key].group];

        const assocs = (group.associations || []).filter(
          assoc => assoc.autoPopulate === true
        );

        // paths.push(`${key}.group`);
        assocs.forEach(assoc => {
          if (isPolymorphic({ assoc })) {
            const rel = formatPolymorphicPopulate({
              assoc,
              path: assoc.alias,
              prefix: `${key}.group.`,
            });

            paths.push(rel);
          } else {
            paths.push(`${key}.group.${assoc.alias}`);
          }
        });

        return [`${key}.group`, ...paths];
      };

      const createGroupsPopulate = () => {
        const groupsToPopulate = groupAttributes.reduce((acc, key) => {
          const attribute = definition.attributes[key];
          const autoPopulate = _.get(attribute, ['autoPopulate'], true);

          if (autoPopulate === true) {
            return acc.concat(populateGroup(key));
          }
          return acc;
        }, []);

        return groupsToPopulate;
      };

      const isGroup = (def, key) =>
        _.get(def, ['attributes', key, 'type']) === 'group';

      const formatPopulateOptions = withRelated => {
        if (!Array.isArray(withRelated)) withRelated = [withRelated];

        const obj = withRelated.reduce((acc, key) => {
          if (_.isString(key)) {
            acc[key] = () => {};
            return acc;
          }

          return _.extend(acc, key);
        }, {});

        // if groups are no
        const finalObj = Object.keys(obj).reduce((acc, key) => {
          // check the key path and update it if necessary nothing more
          const parts = key.split('.');

          let newKey;
          let prefix = '';
          let tmpModel = definition;
          for (let part of parts) {
            if (isGroup(tmpModel, part)) {
              tmpModel = strapi.groups[tmpModel.attributes[part].group];
              // add group path and there relations / images
              const path = `${prefix}${part}.group`;

              newKey = path;
              prefix = `${path}.`;
              continue;
            }

            const assoc = tmpModel.associations.find(
              association => association.alias === part
            );

            if (!assoc) return acc;

            tmpModel = findModelByAssoc({ assoc });

            if (isPolymorphic({ assoc })) {
              const path = formatPolymorphicPopulate({
                assoc,
                path: assoc.alias,
                prefix,
              });

              return _.extend(acc, path);
            }

            newKey = `${prefix}${part}`;
            prefix = `${newKey}.`;
          }

          acc[newKey] = obj[key];
          return acc;
        }, {});

        return [finalObj];
      };

      // Initialize lifecycle callbacks.
      loadedModel.initialize = function() {
        // Load bookshelf plugin arguments from model options
        this.constructor.__super__.initialize.apply(this, arguments);

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

        // Update withRelated level to bypass many-to-many association for polymorphic relationshiips.
        // Apply only during fetching.
        this.on('fetching fetching:collection', (instance, attrs, options) => {
          // do not populate anything
          if (options.withRelated === false) return;
          if (options.isEager === true) return;

          if (_.isNil(options.withRelated)) {
            options.withRelated = []
              .concat(createGroupsPopulate())
              .concat(createAssociationPopulate());
          } else {
            options.withRelated = formatPopulateOptions(options.withRelated);
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

          const formatter = attributes => {
            Object.keys(attributes).forEach(key => {
              const attr = definition.attributes[key] || {};

              if (attributes[key] === null) return;

              if (attr.type === 'json') {
                attributes[key] = JSON.parse(attributes[key]);
              }

              if (attr.type === 'boolean') {
                if (typeof attributes[key] === 'boolean') {
                  return;
                }

                const strVal = attributes[key].toString();
                if (strVal === '1') {
                  attributes[key] = true;
                } else if (strVal === '0') {
                  attributes[key] = false;
                } else {
                  attributes[key] = null;
                }
              }

              if (attr.type === 'date' && definition.client === 'sqlite3') {
                attributes[key] = dateFns.parse(attributes[key]);
              }

              if (
                attr.type === 'biginteger' &&
                definition.client === 'sqlite3'
              ) {
                attributes[key] = attributes[key].toString();
              }
            });
          };

          events.forEach(event => {
            let fn;

            if (event.name.indexOf('collection') !== -1) {
              fn = instance =>
                instance.models.map(entry => {
                  formatter(entry.attributes);
                });
            } else {
              fn = instance => formatter(instance.attributes);
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
              _.has(value, 'columnName') &&
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

      await buildDatabaseSchema({
        ORM,
        definition,
        loadedModel,
        connection,
        model: target[model],
      });

      await createGroupJoinTables({ definition, ORM });
    } catch (err) {
      strapi.log.error(`Impossible to register the '${model}' model.`);
      strapi.log.error(err);
      strapi.stop();
    }
  });

  return Promise.all(updates);
};

const castValueFromType = (type, value /* definition */) => {
  // do not cast null values
  if (value === null) return null;

  switch (type) {
    case 'json':
      return JSON.stringify(value);
    // TODO: handle real date format 1970-01-01
    // TODO: handle real time format 12:00:00
    case 'time':
    case 'timestamp':
    case 'date':
    case 'datetime': {
      const date = dateFns.parse(value);
      if (dateFns.isValid(date)) return date;

      date.setTime(value);

      if (!dateFns.isValid(date)) {
        throw new Error(
          `Invalid ${type} format, expected a timestamp or an ISO date`
        );
      }

      return date;
    }
    default:
      return value;
  }
};
