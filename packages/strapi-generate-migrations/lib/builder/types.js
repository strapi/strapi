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
 * Template types
 */

module.exports = (models, modelName, details, attribute, toDrop, onlyDrop) => {

  // Template: create a new column thanks to the attribute's type.
  // Firt, make sure we know the attribute type. If not, just do it
  // with the `specificType` template.
  let tplTypeCreate;
  try {
    tplTypeCreate = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'types', details.type + '.template'), 'utf8');
  } catch (err) {
    tplTypeCreate = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'types', 'specificType.template'), 'utf8');
  }

  const tplTypeDelete = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn.template'), 'utf8');

  // UP
  _.set(models[modelName].attributes, attribute + '.create', {});

  if (!_.isUndefined(toDrop) && toDrop) {
    // Template: delete a specific column.
    models[modelName].attributes[attribute].create.drop = _.unescape(_.template(tplTypeDelete)({
      tableName: modelName,
      attribute
    }));
  }

  // Create when it's not an onlyDrop action
  if (_.isUndefined(onlyDrop)) {
    models[modelName].attributes[attribute].create.others = _.unescape(_.template(tplTypeCreate)({
      tableName: modelName,
      attribute,
      details
    }));
  }

  // Template: make the column chainable with the `defaultTo` template
  // if a default value is needed.
  if (!_.isUndefined(details.defaultTo)) {
    const tplDefaultTo = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'chainables', 'defaultTo.template'), 'utf8');
    models[modelName].attributes[attribute].create.others += _.unescape(_.template(tplDefaultTo)({
      details
    }));
  }

  // Template: make the column chainable with the `unique` template
  // if the column respect uniqueness rule.
  if (details.unique === true) {
    const tplUnique = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'chainables', 'unique.template'), 'utf8');
    models[modelName].attributes[attribute].create.others += _.unescape(_.template(tplUnique)({}));
  }

  // Template: make the column chainable with the `primary` template
  // if the column needs the rule.
  if (details.primary === true) {
    const tplPrimary = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'chainables', 'primary.template'), 'utf8');
    models[modelName].attributes[attribute].create.others += _.unescape(_.template(tplPrimary)({}));
  }

  // DOWN
  _.set(models[modelName].attributes, attribute + '.delete', {});

  if (!_.isUndefined(toDrop) && toDrop) {
    let tplTypeDeleteCreate;
    try {
      tplTypeDeleteCreate = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'types', models[modelName].oldAttributes[attribute].type + '.template'), 'utf8');
    } catch (err) {
      tplTypeDeleteCreate = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'types', 'specificType.template'), 'utf8');
    }

    // Create when it's not an onlyDrop action
    if (_.isUndefined(onlyDrop)) {
      // Template: delete a specific column.
      models[modelName].attributes[attribute].delete.drop = _.unescape(_.template(tplTypeDelete)({
        tableName: modelName,
        attribute
      }));
    }

    models[modelName].attributes[attribute].delete.others = _.unescape(_.template(tplTypeDeleteCreate)({
      tableName: modelName,
      attribute,
      details: models[modelName].oldAttributes[attribute]
    }));
  } else {
    // Template: delete a specific column.
    models[modelName].attributes[attribute].delete.others = _.unescape(_.template(tplTypeDelete)({
      tableName: modelName,
      attribute
    }));
  }
};
