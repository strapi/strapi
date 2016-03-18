'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Public node modules.
const _ = require('lodash');

/**
 * Create a table if it doesn't exist yet
 * and drop the table to reverse the migration.
 */

module.exports = function (models, modelName) {

  // Template: create the table for the `up` export if it doesn't exist.
  // This adds a `up` logic for the current model.
  // Then, every `up` logic of every model call the
  // `./builder/tables/createTableIfNotExists` template.
  const tplTableCreate = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'createTableIfNotExists.template'), 'utf8');
  models[modelName].up = _.unescape(_.template(tplTableCreate)({
    models: models,
    tableName: modelName,
    attributes: models[modelName].attributes,
    options: models[modelName].options
  }));

  // Template: drop the table for the `down` export.
  // This adds a `down` logic for the current model.
  // Then, every `down` logic of every model call the
  // `./builder/tables/dropTable` template.
  const tplTableDrop = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'dropTable.template'), 'utf8');
  models[modelName].down = _.unescape(_.template(tplTableDrop)({
    tableName: modelName
  }));
};
