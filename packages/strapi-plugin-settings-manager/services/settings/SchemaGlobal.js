'use strict';

/**
 * Schema global variables dependencies
 */

// Public node modules
var _ = require('lodash');

var SchemaGlobal = function(app) {
  var schema = {};

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
