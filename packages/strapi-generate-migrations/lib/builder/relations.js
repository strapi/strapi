'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Public node modules.
const _ = require('lodash');
const pluralize = require('pluralize');

// Collections utils.
const utilsModels = require('strapi-utils').models;
const utilsBookShelf = require('strapi-bookshelf/lib/utils/');

// Template builder.
const selectTable = require('./selectTable');

/**
 * Relationship templates
 */

module.exports = (rootModels, modelName, details, attribute, toDrop, onlyDrop, history) => {
  let tplRelationUp;
  let tplRelationDown;
  let infos = {};
  let oldInfos = {};

  if (!onlyDrop && toDrop) {
    infos = utilsModels.getNature(details, attribute, rootModels);
    oldInfos = utilsModels.getNature(_.get(rootModels[modelName].oldAttributes, attribute), attribute, history);

    const isDifferentVerbose = !(oldInfos.hasOwnProperty('nature') && oldInfos.nature === infos.nature);

    if (isDifferentVerbose) {
      handleRelation(oldInfos, history, modelName, _.get(rootModels[modelName].oldAttributes, attribute), attribute, true, true);
      handleRelation(infos, rootModels, modelName, details, attribute);
    } else {
      handleRelation(infos, rootModels, modelName, details, attribute, true, true);
    }
  } else if (onlyDrop || toDrop) {
    oldInfos = utilsModels.getNature(_.get(rootModels[modelName].oldAttributes, attribute), attribute, history);

    handleRelation(oldInfos, history, modelName, _.get(rootModels[modelName].oldAttributes, attribute), attribute, true, true);
  } else {
    infos = utilsModels.getNature(details, attribute, rootModels);

    handleRelation(infos, rootModels, modelName, details, attribute);
  }

  function handleRelation(infos, models, modelName, details, attribute, toDrop, onlyDrop) {
    if (_.isEmpty(_.get(rootModels[modelName].attributes, attribute + '.create'))) {
      _.set(rootModels[modelName].attributes, attribute + '.create', {
        drop: '',
        others: ''
      });
    }

    if (_.isEmpty(_.get(rootModels[modelName].attributes, attribute + '.delete'))) {
      _.set(rootModels[modelName].attributes, attribute + '.delete', {
        drop: '',
        others: ''
      });
    }

    // If it's a "one-to-one" relationship.
    if (infos.verbose === 'hasOne') {
      // Force singular foreign key.
      details.attribute = pluralize.singular(details.model);

      // Define PK column.
      details.column = utilsBookShelf.getPK(modelName, undefined, models);

      if (!toDrop) {
        tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'hasOne.template'), 'utf8');
        models[modelName].attributes[attribute].create.others += _.unescape(_.template(tplRelationUp)({
          tableName: modelName,
          attribute,
          details
        }));

        tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn-unique.template'), 'utf8');
        models[modelName].attributes[attribute].delete.others += _.unescape(_.template(tplRelationDown)({
          tableName: modelName,
          attribute,
          details
        }));
      } else {
        tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn-unique.template'), 'utf8');
        models[modelName].attributes[attribute].create.drop += _.unescape(_.template(tplRelationDown)({
          tableName: modelName,
          attribute,
          details
        }));

        tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'hasOne.template'), 'utf8');
        models[modelName].attributes[attribute].delete.drop += _.unescape(_.template(tplRelationUp)({
          tableName: modelName,
          attribute,
          details
        }));
      }
    } else if (infos.verbose === 'belongsTo') {
      // Force singular foreign key.
      details.attribute = pluralize.singular(details.model);

      // Define PK column.
      details.column = utilsBookShelf.getPK(modelName, undefined, models);

      if (infos.nature === 'oneToMany' || infos.nature === 'oneWay') {
        if (!toDrop) {
          tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsTo.template'), 'utf8');
          rootModels[modelName].attributes[attribute].create.others += _.unescape(_.template(tplRelationUp)({
            tableName: modelName,
            attribute,
            details,
            nature: infos.nature
          }));

          tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn.template'), 'utf8');
          rootModels[modelName].attributes[attribute].delete.drop += _.unescape(_.template(tplRelationDown)({
            tableName: modelName,
            attribute,
            details
          }));
        } else {
          tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropForeign.template'), 'utf8');
          rootModels[modelName].attributes[attribute].create.drop += _.unescape(_.template(tplRelationDown)({
            tableName: modelName,
            attribute,
            details
          }));

          tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsTo.template'), 'utf8');
          rootModels[modelName].attributes[attribute].delete.others += _.unescape(_.template(tplRelationUp)({
            tableName: modelName,
            attribute,
            details,
            nature: infos.nature
          }));
        }
      } else {
        if (!toDrop) {
          tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsTo-unique.template'), 'utf8');
          rootModels[modelName].attributes[attribute].create.others += _.unescape(_.template(tplRelationUp)({
            tableName: modelName,
            attribute,
            details
          }));

          tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn-unique.template'), 'utf8');
          rootModels[modelName].attributes[attribute].delete.drop += _.unescape(_.template(tplRelationDown)({
            tableName: modelName,
            attribute,
            details
          }));
        } else {
          tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn.template'), 'utf8');
          rootModels[modelName].attributes[attribute].create.drop += _.unescape(_.template(tplRelationDown)({
            tableName: modelName,
            attribute,
            details
          }));

          tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsTo.template'), 'utf8');
          rootModels[modelName].attributes[attribute].delete.others += _.unescape(_.template(tplRelationUp)({
            tableName: modelName,
            attribute,
            details,
            nature: infos.nature
          }));
        }
      }
    } else if (infos.verbose === 'hasMany') {
      if (toDrop) {
        tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropForeign.template'), 'utf8');
        rootModels[modelName].attributes[attribute].create.drop += _.unescape(_.template(tplRelationDown)({
          tableName: modelName,
          attribute,
          details
        }));

        tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsTo.template'), 'utf8');
        rootModels[modelName].attributes[attribute].delete.others += _.unescape(_.template(tplRelationUp)({
          tableName: modelName,
          attribute,
          details,
          nature: infos.nature
        }));
      }
    } else if (infos.verbose === 'belongsToMany') {
      // Otherwise if it's a "many-to-many" relationship.

      // Save the relationship.
      const relationship = models[details.collection].attributes[details.via];

      // Construct relation table name.
      const relationTable = _.map(_.sortBy([relationship, details], 'collection'), table => {
        return _.snakeCase(pluralize.plural(table.collection) + ' ' + pluralize.plural(table.via));
      }).join('__');

      // Force singular foreign key.
      relationship.attribute = pluralize.singular(relationship.collection);
      details.attribute = pluralize.singular(details.collection);

      // Define PK column.
      details.column = utilsBookShelf.getPK(modelName, undefined, models);
      relationship.column = utilsBookShelf.getPK(details.collection, undefined, models);

      // Avoid to create table both times.
      if (!rootModels.hasOwnProperty(relationTable) || !_.isEmpty(_.get(rootModels, relationTable + '.up.drop'))) {
        // Set objects
        if (_.isUndefined(_.get(models, relationTable + '.up.others'))) {
          _.set(rootModels, relationTable + '.up.others', '');
        }

        if (_.isUndefined(_.get(rootModels, relationTable + '.up.drop'))) {
          _.set(rootModels, relationTable + '.up.drop', '');
        }

        if (_.isUndefined(_.get(rootModels, relationTable + '.down.others'))) {
          _.set(rootModels, relationTable + '.down.others', '');
        }

        if (_.isUndefined(_.get(rootModels, relationTable + '.down.drop'))) {
          _.set(rootModels, relationTable + '.down.drop', '');
        }

        if (_.isUndefined(_.get(rootModels, relationTable + '.attributes'))) {
          _.set(rootModels, relationTable + '.attributes', {});
        }

        if (!toDrop) {
          // Load templates.
          const tplTableUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsToMany.template'), 'utf8');
          const tplTableDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'dropTable.template'), 'utf8');

          // Create relationships table for many-to-many.
          rootModels[relationTable].up.others += _.unescape(_.template(tplTableUp)({
            models,
            tableName: relationTable,
            details,
            relationship
          }));

          if (_.isUndefined(_.get(rootModels, relationTable + '.attributes.fk'))) {
            // Load templates.
            const tplFKDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropForeign.template'), 'utf8');
            const tplSelectTableDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'select', 'down.template'), 'utf8');

            // Drop current relationships table on migration rollback.
            rootModels[relationTable].down.others += _.unescape(_.template(tplTableDown)({
              tableName: relationTable
            }));

            // Remove foreign key current relationships table before drop the table on migration rollback.
            rootModels[relationTable].attributes.fk = {
              delete: {
                drop: _.unescape(_.template(tplFKDown)({
                  attribute: details.attribute + '_' + details.column
                })) + _.unescape(_.template(tplFKDown)({
                  attribute: relationship.attribute + '_' + relationship.column
                }))
              }
            };

            rootModels[relationTable].down.drop += _.unescape(_.template(tplSelectTableDown)({
              models,
              tableName: relationTable,
              attributes: models[relationTable].attributes,
              toDrop: true
            }));
          } else {
            const dropMigrationTable = _.unescape(_.template(tplTableDown)({
              tableName: relationTable
            }));

            // Eliminate duplicate
            if (rootModels[relationTable].down.drop.indexOf(dropMigrationTable) === -1) {
              // Drop current relationships table on migration rollback.
              rootModels[relationTable].down.drop += dropMigrationTable;
            }
          }
        } else if (onlyDrop) {
          // Load templates.
          const tplTableUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsToMany.template'), 'utf8');
          const tplTableDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'dropTable.template'), 'utf8');
          const tplFKDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropForeign.template'), 'utf8');

          const dropMigrationTable = _.unescape(_.template(tplTableDown)({
            tableName: relationTable
          }));

          if (_.isUndefined(_.get(rootModels[relationTable].attributes, 'fk.delete')) && _.get(rootModels[modelName].newAttributes[attribute], 'isRemoved') !== true) {
            // Eliminate duplicate
            if (rootModels[relationTable].up.drop.indexOf(dropMigrationTable) === -1) {
              // Drop current relationships table on migration run.
              rootModels[relationTable].up.drop += _.unescape(_.template(tplTableDown)({
                tableName: relationTable
              }));
            }

            // We have to this to be in the up template loop
            _.set(rootModels[relationTable], 'newAttributes.fk', {});
            _.set(rootModels[relationTable].attributes, 'fk', {
              delete: {
                drop: ''
              }
            });

            // Drop first FK on migration relation table.
            const dropMigrationFK1 = _.unescape(_.template(tplFKDown)({
              attribute: details.attribute + '_' + details.column
            }));

            // Eliminate duplicate
            if (rootModels[relationTable].attributes.fk.delete.drop.indexOf(dropMigrationFK1) === -1) {
              // Remove foreign key current relationships table before drop the table on migration rollback.
              rootModels[relationTable].attributes.fk.delete.drop += dropMigrationFK1;
            }

            // Drop first FK on migration relation table.
            const dropMigrationFK2 = _.unescape(_.template(tplFKDown)({
              attribute: relationship.attribute + '_' + relationship.column
            }));

            // Eliminate duplicate
            if (rootModels[relationTable].attributes.fk.delete.drop.indexOf(dropMigrationFK2) === -1) {
              rootModels[relationTable].attributes.fk.delete.drop += dropMigrationFK2;
            }

            // Builder: select the table.
            selectTable(rootModels, relationTable);
          } else if (_.get(rootModels[modelName].newAttributes[attribute], 'isRemoved') === true) {
            // Eliminate duplicate
            if (rootModels[relationTable].up.others.indexOf(dropMigrationTable) === -1) {
              // Drop current relationships table on migration run.
              rootModels[relationTable].up.others += _.unescape(_.template(tplTableDown)({
                tableName: relationTable
              }));
            }

            if (_.isUndefined(_.get(rootModels[relationTable].attributes, 'fk.create'))) {
              // We have to this to be in the up template loop
              _.set(rootModels[relationTable], 'newAttributes.fk.create', {});
              _.set(rootModels[relationTable].attributes, 'fk', {
                create: {
                  drop: ''
                }
              });

              // Drop first FK on migration relation table.
              const dropMigrationFK1 = _.unescape(_.template(tplFKDown)({
                attribute: details.attribute + '_' + details.column
              }));

              // Eliminate duplicate
              if (rootModels[relationTable].attributes.fk.create.drop.indexOf(dropMigrationFK1) === -1) {
                // Remove foreign key current relationships table before drop the table on migration rollback.
                rootModels[relationTable].attributes.fk.create.drop += dropMigrationFK1;
              }

              // Drop first FK on migration relation table.
              const dropMigrationFK2 = _.unescape(_.template(tplFKDown)({
                attribute: relationship.attribute + '_' + relationship.column
              }));

              // Eliminate duplicate
              if (rootModels[relationTable].attributes.fk.create.drop.indexOf(dropMigrationFK2) === -1) {
                rootModels[relationTable].attributes.fk.create.drop += dropMigrationFK2;
              }

              // Builder: select the table.
              selectTable(rootModels, relationTable);
            }
          }

          // Eliminate duplicate
          if (rootModels[relationTable].down.others.indexOf('createTableIfNotExists(\'' + relationTable + '\'') === -1) {
            // Create previous relationships table on migration rollback.
            rootModels[relationTable].down.others += _.unescape(_.template(tplTableUp)({
              models,
              tableName: relationTable || relationTable,
              details,
              relationship
            }));
          }
        }
      }
    }
  }
};
