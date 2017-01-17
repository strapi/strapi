'use strict';

/**
 * Schema global variables dependencies
 */

// Public node modules
const _ = require('lodash');

const SchemaGlobal = function(app) {
  const schema = {};

  _.forEach(app.config.globals, function(value, key) {
    schema[key] = {
      type: 'boolean',
      nested: 'globals',
      path: 'config/globals.json'
    };
  });

  return schema;
};

module.exports = SchemaGlobal;
