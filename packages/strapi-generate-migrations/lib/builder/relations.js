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
const utilsModels = require('strapi/lib/configuration/hooks/models/utils/');
const utilsBookShelf = require('strapi-bookshelf/lib/utils/');

/**
 * Relationship templates
 */

module.exports = function (models, modelName, details, attribute, toDrop, onlyDrop, history) {
  let tplRelationUp;
  let tplRelationDown;

  const infos = toDrop ? utilsModels.getNature(details, attribute, history) : utilsModels.getNature(details, attribute, models);

  _.set(models[modelName].attributes, attribute + '.create', {});
  _.set(models[modelName].attributes, attribute + '.delete', {});

  // If it's a "one-to-one" relationship.
  if (infos.verbose === 'hasOne') {
    // Force singular foreign key.
    details.attribute = pluralize.singular(details.model);

    // Define PK column.
    details.column = utilsBookShelf.getPK(modelName, undefined, models);

    // Template: create a new column thanks to the attribute's relation.
    // Simply make a `create` template for this attribute wich will be added
    // to the table template-- either `./builder/tables/selectTable` or
    // `./builder/tables/createTableIfNotExists`.
    tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'hasOne.template'), 'utf8');
    models[modelName].attributes[attribute].create.others = _.unescape(_.template(tplRelationUp)({
      tableName: modelName,
      attribute: attribute,
      details: details
    }));

    // Template: drop the column.
    // Simply make a `delete` template for this attribute wich drop the column
    // with the `./builder/columns/dropColumn` template.
    tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn-unique.template'), 'utf8');
    models[modelName].attributes[attribute].delete.others = _.unescape(_.template(tplRelationDown)({
      tableName: modelName,
      attribute: attribute,
      details: details
    }));
  } else if (infos.verbose === 'belongsTo') {
    // Force singular foreign key.
    details.attribute = pluralize.singular(details.model);

    // Define PK column.
    details.column = utilsBookShelf.getPK(modelName, undefined, models);

    if (infos.nature === 'oneToMany' || infos.nature === 'oneWay') {
      // Template: create a new column thanks to the attribute's relation.
      // Simply make a `create` template for this attribute wich will be added
      // to the table template-- either `./builder/tables/selectTable` or
      // `./builder/tables/createTableIfNotExists`.
      tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsTo.template'), 'utf8');
      models[modelName].attributes[attribute].create.others = _.unescape(_.template(tplRelationUp)({
        tableName: modelName,
        attribute: attribute,
        details: details,
        nature: infos.nature
      }));

      // Template: drop the column.
      // Simply make a `delete` template for this attribute wich drop the column
      // with the `./builder/columns/dropColumn` template.
      tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn.template'), 'utf8');
      models[modelName].attributes[attribute].delete.others = _.unescape(_.template(tplRelationDown)({
        tableName: modelName,
        attribute: attribute,
        details: details
      }));
    } else {
      // Template: create a new column thanks to the attribute's relation.
      // Simply make a `create` template for this attribute wich will be added
      // to the table template-- either `./builder/tables/selectTable` or
      // `./builder/tables/createTableIfNotExists`.
      tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsTo-unique.template'), 'utf8');
      models[modelName].attributes[attribute].create.others = _.unescape(_.template(tplRelationUp)({
        tableName: modelName,
        attribute: attribute,
        details: details
      }));

      // Template: drop the column.
      // Simply make a `delete` template for this attribute wich drop the column
      // with the `./builder/columns/dropColumn` template.
      tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn-unique.template'), 'utf8');
      models[modelName].attributes[attribute].delete.others = _.unescape(_.template(tplRelationDown)({
        tableName: modelName,
        attribute: attribute,
        details: details
      }));
    }
  } else if (infos.verbose === 'belongsToMany') {
    // Otherwise if it's a "many-to-many" relationship.

    let relationship;
    let relationTable;

    if (!onlyDrop) {
      // Save the relationship.
      relationship = models[details.collection].attributes[details.via];

      // Construct relation table name.
      relationTable = _.map(_.sortBy([relationship, details], 'collection'), function (table) {
        return _.snakeCase(pluralize.plural(table.collection) + ' ' + pluralize.plural(table.via));
      }).join('__');

      // Force singular foreign key.
      relationship.attribute = pluralize.singular(relationship.collection);
      details.attribute = pluralize.singular(details.collection);

      // Define PK column.
      details.column = utilsBookShelf.getPK(modelName, undefined, models);
      relationship.column = utilsBookShelf.getPK(details.collection, undefined, models);
    }

    // Avoid to create table both times.
    if (!models.hasOwnProperty(relationTable) || !_.isEmpty(_.get(models, relationTable + '.up.drop'))) {
      // Set objects
      if (_.isUndefined(_.get(models, relationTable + '.up.others'))) {
        _.set(models, relationTable + '.up.others', '');
      }

      if (_.isUndefined(_.get(models, relationTable + '.up.drop'))) {
        _.set(models, relationTable + '.up.drop', '');
      }

      if (_.isUndefined(_.get(models, relationTable + '.down.others'))) {
        _.set(models, relationTable + '.down.others', '');
      }

      if (_.isUndefined(_.get(models, relationTable + '.down.drop'))) {
        _.set(models, relationTable + '.down.drop', '');
      }

      if (_.isUndefined(_.get(models, relationTable + '.attributes'))) {
        _.set(models, relationTable + '.attributes', {});
      }

      if (!toDrop) {
        // Load templates.
        const tplTableUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsToMany.template'), 'utf8');
        const tplTableDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'dropTable.template'), 'utf8');

        // Create relationships table for many-to-many.
        models[relationTable].up.others += _.unescape(_.template(tplTableUp)({
          models: models,
          tableName: relationTable,
          details: details,
          relationship: relationship
        }));

        if (_.isUndefined(_.get(models, relationTable + '.attributes.fk'))) {
          // Load templates.
          const tplFKDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropForeign.template'), 'utf8');
          const tplSelectTableDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'select', 'down.template'), 'utf8');

          // Drop current relationships table on migration rollback.
          models[relationTable].down.others += _.unescape(_.template(tplTableDown)({
            tableName: relationTable
          }));

          // Remove foreign key current relationships table before drop the table on migration rollback.
          models[relationTable].attributes.fk = {
            delete: {
              drop: _.unescape(_.template(tplFKDown)({
                attribute: details.attribute + '_' + details.column
              })) + _.unescape(_.template(tplFKDown)({
                attribute: relationship.attribute + '_' + relationship.column
              }))
            }
          };

          models[relationTable].down.drop += _.unescape(_.template(tplSelectTableDown)({
            models: models,
            tableName: relationTable,
            attributes: models[relationTable].attributes,
            toDrop: true
          }));
        }

        const dropMigrationTable = _.unescape(_.template(tplTableDown)({
          tableName: relationTable
        }));

        // Eliminate duplicate
        if (models[relationTable].down.drop.indexOf(dropMigrationTable) === -1) {
          // Drop current relationships table on migration rollback.
          models[relationTable].down.drop += dropMigrationTable;
        }
      } else if (onlyDrop) {
        // Load templates.
        const tplTableUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsToMany.template'), 'utf8');
        const tplTableDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'dropTable.template'), 'utf8');

        // Save the old relationship.
        const oldRelationship = history[details.collection].attributes[details.via];

        // Construct old relation table name.
        const oldRelationTable = _.map(_.sortBy([oldRelationship, details], 'collection'), function (table) {
          return _.snakeCase(pluralize.plural(table.collection) + ' ' + pluralize.plural(table.via));
        }).join('__');

        // Force singular foreign key.
        oldRelationship.attribute = pluralize.singular(oldRelationship.collection);
        details.attribute = pluralize.singular(details.collection);

        // Define PK column.
        oldRelationship.column = utilsBookShelf.getPK(details.collection, undefined, models);
        details.column = utilsBookShelf.getPK(modelName, undefined, models);


        const dropMigrationTable = _.unescape(_.template(tplTableDown)({
          tableName: oldRelationTable || relationTable
        }));

        // Eliminate duplicate
        if (models[relationTable].up.drop.indexOf(dropMigrationTable) === -1) {
          // Drop current relationships table on migration run.
          models[relationTable].up.drop += _.unescape(_.template(tplTableDown)({
            tableName: oldRelationTable || relationTable
          }));
        }

        // Drop current relationships table on migration rollback.
        // This allows us to identify, if this is an update on already existing many-to-many relationship or if this is a basic addition.
        if (_.isUndefined(_.get(models, relationTable + '.attributes.fk'))) {
          models[relationTable].attributes.fk = {
            delete: {
              drop: _.unescape(_.template(tplTableDown)({
                tableName: relationTable
              }))
            }
          };
        } else {
          // Create previous relationships table on migration rollback.
          models[relationTable].down.others += _.unescape(_.template(tplTableUp)({
            models: models,
            tableName: oldRelationTable || relationTable,
            details: details,
            relationship: oldRelationship || relationship
          }));
        }
      }
    }
  }
};
