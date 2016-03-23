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
 * Select table
 */

module.exports = function (models, modelName) {

  if (!models[modelName].hasOwnProperty('up')) {
    models[modelName].up = {
      drop: '',
      others: ''
    };
  }

  // Template: select the table for the `up` export.
  // Every attribute with `create` key will be added in this template.
  const tplSelectTableUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'select', 'up.template'), 'utf8');
  models[modelName].up.drop += _.unescape(_.template(tplSelectTableUp)({
    models: models,
    tableName: modelName,
    attributes: models[modelName].newAttributes,
    toDrop: true
  }));

  models[modelName].up.others += _.unescape(_.template(tplSelectTableUp)({
    models: models,
    tableName: modelName,
    attributes: models[modelName].newAttributes,
    toDrop: false
  }));

  if (!models[modelName].hasOwnProperty('down')) {
    models[modelName].down = {
      drop: '',
      others: ''
    };
  }

  // Template: select the table for the `down` export.
  // Every attribute with `delete` key will be added in this template.
  const tplSelectTableDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'select', 'down.template'), 'utf8');
  models[modelName].down.drop += _.unescape(_.template(tplSelectTableDown)({
    models: models,
    tableName: modelName,
    attributes: models[modelName].newAttributes,
    toDrop: true
  }));

  models[modelName].down.others += _.unescape(_.template(tplSelectTableDown)({
    models: models,
    tableName: modelName,
    attributes: models[modelName].newAttributes,
    toDrop: false
  }));
};
