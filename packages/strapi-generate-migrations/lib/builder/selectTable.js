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

module.exports = (models, modelName) => {

  if (!models[modelName].hasOwnProperty('up')) {
    models[modelName].up = {
      drop: '',
      others: ''
    };
  }

  // Allow to template only when it's necessary
  let emptyArrayForDrop = [];
  let emptyArrayForOthers = [];

  _.forEach(models[modelName].newAttributes, (attribute, key) => {
    if (!_.isEmpty(_.get(models[modelName].attributes, key + '.create.drop'))) {
      emptyArrayForDrop.push(true);
    }

    if (!_.isEmpty(_.get(models[modelName].attributes, key + '.create.others'))) {
      emptyArrayForOthers.push(true);
    }
  });

  // Template: select the table for the `up` export.
  // Every attribute with `create` key will be added in this template.
  const tplSelectTableUp = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'select', 'up.template'), 'utf8');

  if (!_.isEmpty(emptyArrayForDrop)) {
    models[modelName].up.drop += _.unescape(_.template(tplSelectTableUp)({
      models,
      tableName: modelName,
      attributes: models[modelName].newAttributes,
      toDrop: true
    }));
  }

  if (!_.isEmpty(emptyArrayForOthers)) {
    models[modelName].up.others += _.unescape(_.template(tplSelectTableUp)({
      models,
      tableName: modelName,
      attributes: models[modelName].newAttributes,
      toDrop: false
    }));
  }

  if (!models[modelName].hasOwnProperty('down')) {
    models[modelName].down = {
      drop: '',
      others: ''
    };
  }

  // Allow to template only when it's necessary
  emptyArrayForDrop = [];
  emptyArrayForOthers = [];

  _.forEach(models[modelName].newAttributes, (attribute, key) => {
    if (!_.isEmpty(_.get(models[modelName].attributes, key + '.delete.drop'))) {
      emptyArrayForDrop.push(true);
    }

    if (!_.isEmpty(_.get(models[modelName].attributes, key + '.delete.others'))) {
      emptyArrayForOthers.push(true);
    }
  });

  // Template: select the table for the `down` export.
  // Every attribute with `delete` key will be added in this template.
  const tplSelectTableDown = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'select', 'down.template'), 'utf8');

  if (!_.isEmpty(emptyArrayForDrop)) {
    models[modelName].down.drop += _.unescape(_.template(tplSelectTableDown)({
      models,
      tableName: modelName,
      attributes: models[modelName].newAttributes,
      toDrop: true
    }));
  }

  if (!_.isEmpty(emptyArrayForOthers)) {
    models[modelName].down.others += _.unescape(_.template(tplSelectTableDown)({
      models,
      tableName: modelName,
      attributes: models[modelName].newAttributes,
      toDrop: false
    }));
  }
};
