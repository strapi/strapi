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

// Bookshelf utils.
const utilsBookShelf = require('strapi-bookshelf/lib/utils/');

/**
 * Relationship templates
 */

module.exports = function (models, modelName, details, attribute) {
  let tplRelationUp;
  let tplRelationDown;

  const infos = utilsBookShelf.getNature(details, attribute, models);

  // If it's a "one-to-one" relationship.
  if (infos.verbose === 'hasOne') {

    // Force singular foreign key
    details.attribute = pluralize.singular(details.model);

    // Define PK column
    details.column = utilsBookShelf.getPK(modelName, models);

    // Template: create a new column thanks to the attribute's relation.
    // Simply make a `create` template for this attribute wich will be added
    // to the table template-- either `./builder/tables/selectTable` or
    // `./builder/tables/createTableIfNotExists`.
    tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'hasOne.template'), 'utf8');
    models[modelName].attributes[attribute].create = _.unescape(_.template(tplRelationUp)({
      tableName: modelName,
      attribute: attribute,
      details: details
    }));

    // Template: drop the column.
    // Simply make a `delete` template for this attribute wich drop the column
    // with the `./builder/columns/dropColumn` template.
    tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn.template'), 'utf8');
    models[modelName].attributes[attribute].delete = _.unescape(_.template(tplRelationDown)({
      tableName: modelName,
      attribute: attribute,
      details: details
    }));
  }

  else if (infos.verbose === 'belongsTo') {
    // Force singular foreign key
    details.attribute = pluralize.singular(details.model);

    // Define PK column
    details.column = utilsBookShelf.getPK(modelName, models);

    if (infos.nature === 'oneToMany' || infos.nature === 'oneWay') {
      // Template: create a new column thanks to the attribute's relation.
      // Simply make a `create` template for this attribute wich will be added
      // to the table template-- either `./builder/tables/selectTable` or
      // `./builder/tables/createTableIfNotExists`.
      tplRelationUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsTo.template'), 'utf8');
      models[modelName].attributes[attribute].create = _.unescape(_.template(tplRelationUp)({
        tableName: modelName,
        attribute: attribute,
        details: details,
        nature: infos.nature
      }));

      // Template: drop the column.
      // Simply make a `delete` template for this attribute wich drop the column
      // with the `./builder/columns/dropColumn` template.
      tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn.template'), 'utf8');
      models[modelName].attributes[attribute].delete = _.unescape(_.template(tplRelationDown)({
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
      models[modelName].attributes[attribute].create = _.unescape(_.template(tplRelationUp)({
        tableName: modelName,
        attribute: attribute,
        details: details
      }));

      // Template: drop the column.
      // Simply make a `delete` template for this attribute wich drop the column
      // with the `./builder/columns/dropColumn` template.
      tplRelationDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn.template'), 'utf8');
      models[modelName].attributes[attribute].delete = _.unescape(_.template(tplRelationDown)({
        tableName: modelName,
        attribute: attribute,
        details: details
      }));
    }
  }

  // Otherwise if it's a "many-to-many" relationship.
  else if (infos.verbose === 'belongsToMany') {
    // Save the relationship.
    const relationship = models[details.collection].attributes[details.via];

    // Construct relation table name
    const relationTable = _.map(_.sortBy([relationship, details], 'collection'), function (table) {
      return _.snakeCase(pluralize.plural(table.collection) + ' ' + pluralize.plural(table.via));
    }).join('__');

    // Force singular foreign key
    relationship.attribute = pluralize.singular(relationship.collection);
    details.attribute = pluralize.singular(details.collection);

    // Define PK column
    details.column = utilsBookShelf.getPK(modelName, models);
    relationship.column = utilsBookShelf.getPK(details.collection, models);

    if (!models.hasOwnProperty(relationTable)) {
      // Save the relation table as a new model in the scope
      // aiming to benefit of templates for the table such as
      // `createTableIfNotExists` and `dropTable`.
      models[relationTable] = {};

      // Template: create the table for the `up` export if it doesn't exist.
      // This adds a `up` logic for the relation table.
      const tplTableUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'relations', 'belongsToMany.template'), 'utf8');
      models[relationTable].up = _.unescape(_.template(tplTableUp)({
        models: models,
        tableName: relationTable,
        details: details,
        relationship: relationship
      }));

      // Template: drop the table for the `down` export.
      // This adds a `down` logic for the relation table.
      const tplTableDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'dropTable.template'), 'utf8');
      models[relationTable].down = _.unescape(_.template(tplTableDown)({
        tableName: relationTable
      }));
    }
  }
};
