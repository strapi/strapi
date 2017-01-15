'use strict';

/**
 * Schema Dashboard & Studio variables dependencies
 */

var SchemaStudio = function() {
  var schema = {
    studio: {
      type: 'object',
      path: 'config/studio.json',
      values: {
        object: {
          enabled: {
            type: 'boolean'
          },
          secretKey: {
            type: 'string'
          }
        }
      },
      resolver: function(rootValue, value, scope, cb) {
        scope.studio = value;

        return cb(null, scope.studio);
      }
    }
  };

  return schema;
};

module.exports = SchemaStudio;
