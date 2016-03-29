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

module.exports = function (models, modelName, details, attribute) {

  // Template: create a new column thanks to the attribute's type.
  // Firt, make sure we know the attribute type. If not, just do it
  // with the `specificType` template.
  let tplTypeCreate;
  try {
    tplTypeCreate = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'types', details.type + '.template'), 'utf8');
  } catch (err) {
    tplTypeCreate = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'types', 'specificType.template'), 'utf8');
  }
  models[modelName].attributes[attribute].create = _.unescape(_.template(tplTypeCreate)({
    tableName: modelName,
    attribute: attribute,
    details: details
  }));

  // Template: make the column chainable with the `defaultTo` template
  // if a default value is needed.
  if (!_.isUndefined(details.defaultTo)) {
    const tplDefaultTo = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'chainables', 'defaultTo.template'), 'utf8');
    models[modelName].attributes[attribute].create += _.unescape(_.template(tplDefaultTo)({
      details: details
    }));
  }

  // Template: make the column chainable with the `unique` template
  // if the column respect uniqueness rule.
  if (details.unique === true) {
    const tplUnique = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'chainables', 'unique.template'), 'utf8');
    models[modelName].attributes[attribute].create += _.unescape(_.template(tplUnique)({}));
  }

  // Template: make the column chainable with the `primary` template
  // if the column needs the rule.
  if (details.primary === true) {
    const tplPrimary = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'chainables', 'primary.template'), 'utf8');
    models[modelName].attributes[attribute].create += _.unescape(_.template(tplPrimary)({}));
  }

  // Template: delete a specific column.
  const tplTypeDelete = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'columns', 'dropColumn.template'), 'utf8');
  models[modelName].attributes[attribute].delete = _.unescape(_.template(tplTypeDelete)({
    tableName: modelName,
    attribute: attribute
  }));
};
