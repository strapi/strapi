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
 * Add options to a table
 */

module.exports = (models, modelName, value, option) => {

  // Template: add a specific option.
  // This is only called when we create a new table.
  // The option's template is included in the
  // `./builder/tables/createTableIfNotExists` template.
  const tplOption = fs.readFileSync(path.resolve(__dirname, '..', '..', 'templates', 'builder', 'tables', 'options', option + '.template'), 'utf8');
  models[modelName][option] = _.unescape(_.template(tplOption)({
    tableName: modelName,
    option,
    value
  }));
};
