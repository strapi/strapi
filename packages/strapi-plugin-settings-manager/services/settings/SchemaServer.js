'use strict';

/**
 * Schema general dependencies
 */

// Public node modules
const _ = require('lodash');
const validator = require('validator');

const SchemaServer = function(app) {
  const schema = {
    serverHost: {
      type: 'string',
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/server.json',
      key: 'host',
      resolver: function(rootValue, value, scope, cb) {
        return cb(null, _.trim(value));
      }
    },
    serverPort: {
      type: ['integer', 'string'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/server.json',
      key: 'port',
      resolver: function(rootValue, value, scope, cb) {
        if (_.isString(value) && _.isEmpty(value)) {
          return cb(null, '');
        } else if (value >= 0 && value <= 65535) {
          return cb(null, value);
        }

        return cb('Invalid port number', null);
      }
    },
    frontendHost: {
      type: 'string',
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/server.json',
      key: 'frontendUrl',
      resolver: function(rootValue, value, scope, cb) {
        if (validator.isURL(value) || _.isEmpty(value)) {
          return cb(null, value);
        }

        return cb('Invalid front-end host URL', null);
      }
    },
    reload: {
      type: ['boolean', 'object'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/server.json',
      values: {
        object: {
          timeout: {
            type: 'integer'
          },
          workers: {
            type: 'integer'
          }
        }
      }
    },
    logger: {
      type: 'boolean',
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/server.json'
    },
    parser: {
      type: ['boolean', 'object'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/server.json',
      values: {
        object: {
          encode: {
            type: 'string'
          },
          formLimit: {
            type: 'string'
          },
          jsonLimit: {
            type: 'string'
          },
          strict: {
            type: 'boolean'
          }
        }
      },
      resolver: function(rootValue, value, scope, cb) {
        if (_.isObject(value) && !value.hasOwnProperty('extendTypes')) {
          value.extendTypes = {
            json: ['application/x-javascript']
          };
        }

        return cb(null, value);
      }
    },
    gzip: {
      type: 'boolean',
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/server.json'
    },
    responseTime: {
      type: 'boolean',
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/server.json'
    }
  };

  return schema;
};

module.exports = SchemaServer;
