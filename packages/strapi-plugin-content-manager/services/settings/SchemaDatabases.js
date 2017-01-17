'use strict';

/**
 * Schema general dependencies
 */

// Public node modules
const _ = require('lodash');
const validator = require('validator');

const SchemaDatabases = function(app) {
  const schema = {
    adapter: {
      type: 'string',
      path: null,
      update: false,
      resolver: function(rootValue, value, scope, cb) {
        if (_.includes(['mongo', 'redis', 'arangodb', 'mysql', 'postgresql', 'sqlite', 'disk'], value)) {
          return cb(null, value);
        }

        return cb('Unknow adapter', null);
      }
    },
    name: {
      type: 'string',
      path: null,
      update: false,
      resolver: function(rootValue, value, scope, cb) {
        return cb(null, _.trim(_.deburr(value)));
      }
    },
    host: {
      type: 'string',
      path: null,
      update: false,
      resolver: function(rootValue, value, scope, cb) {
        if (validator.isURL(value) || validator.isIP(value)) {
          return cb(null, value);
        }

        return cb('Invalid host', null);
      }
    },
    port: {
      type: 'integer',
      path: null,
      update: false
    },
    database: {
      type: 'string',
      path: null,
      update: false,
      resolver: function(rootValue, value, scope, cb) {
        return cb(null, _.trim(_.deburr(value)));
      }
    },
    user: {
      type: 'string',
      path: null,
      update: false,
      resolver: function(rootValue, value, scope, cb) {
        return cb(null, _.trim(_.deburr(value)));
      }
    },
    password: {
      type: 'string',
      path: null,
      update: false
    }
  };

  const schemaExtend = {
    adapter: {
      type: 'string',
      path: null,
      update: false,
      resolver: function(rootValue, value, scope, cb) {
        if (_.includes(['mongo', 'redis', 'arangodb', 'mysql', 'postgresql', 'sqlite', 'disk'], value)) {
          return cb(null, value);
        }

        return cb('Unknow adapter', null);
      }
    },
    name: {
      type: 'string',
      path: null,
      update: false,
      resolver: function(rootValue, value, scope, cb) {
        return cb(null, _.trim(_.deburr(value)));
      }
    },
    host: {
      type: 'string',
      path: null,
      update: false,
      resolver: function(rootValue, value, scope, cb) {
        if (validator.isURL(value) || validator.isIP(value)) {
          return cb(null, value);
        }

        return cb('Invalid host', null);
      }
    },
    database: {
      type: 'string',
      path: null,
      update: false,
      resolver: function(rootValue, value, scope, cb) {
        return cb(null, _.trim(_.deburr(value)));
      }
    },
    filePath: {
      type: 'string',
      path: null,
      update: false
    },
    fileName: {
      type: 'string',
      path: null,
      update: false,
      resolver: function(rootValue, value, scope, cb) {
        return cb(null, _.trim(_.deburr(value)));
      }
    },
    migrate: {
      type: 'string',
      path: null,
      update: false
    }
  };

  return (app.isExtend) ? schemaExtend : schema;
};

module.exports = SchemaDatabases;
