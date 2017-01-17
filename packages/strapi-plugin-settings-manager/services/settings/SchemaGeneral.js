'use strict';

/**
 * Schema general dependencies
 */

// Public node modules
const _ = require('lodash');
const semver = require('semver');

// Local services
// var SocketService = require('../SocketService');

const SchemaGeneral = function() {
  const schema = {
    name: {
      type: 'string',
      path: 'package.json',
      resolver: function(rootValue, value, scope, cb) {
        return cb(null, _.trim(_.deburr(value)));
      }
    },
    description: {
      type: 'string',
      path: 'package.json',
      resolver: function(rootValue, value, scope, cb) {
        return cb(null, _.trim(value));
      }
    },
    version: {
      type: 'string',
      path: 'package.json',
      resolver: function(rootValue, value, scope, cb) {
        if (_.isNull(semver.valid(value))) {
          return cb('Not valid as a semver version', null);
        }

        return cb(null, value);
      }
    },
    // static: {
    //   type: 'boolean',
    //   path: 'config/general.json'
    // },
    // views: {
    //   type: ['boolean', 'object'],
    //   path: 'config/general.json',
    //   values: {
    //     object: {
    //       default: {
    //         type: 'string'
    //       },
    //       map: {
    //         type: 'object'
    //       }
    //     }
    //   },
    //   resolver: function(rootValue, value, scope, cb) {
    //     if (_.isObject(value)) {
    //       if (_.isEmpty(value.map)) {
    //         // Set lodash as default template engine
    //         value = {
    //           map: {
    //             html: 'lodash'
    //           },
    //           default: 'html'
    //         };
    //       } else if (!value.map.hasOwnProperty(value.default)) {
    //         value.default = _.first(_.keys(value.map));
    //       }
    //     }
    //
    //     return cb(null, value);
    //   }
    // },
    // websockets: {
    //   type: 'boolean',
    //   path: 'config/general.json'
    // },
    // prefix: {
    //   type: 'string',
    //   path: 'config/general.json'
    // },
    // blueprints: {
    //   type: ['boolean', 'object'],
    //   path: 'config/general.json',
    //   values: {
    //     object: {
    //       defaultLimit: {
    //         type: 'integer'
    //       },
    //       populate: {
    //         type: 'boolean'
    //       }
    //     }
    //   },
    //   resolver: function(rootValue, value, scope, cb) {
    //     if (value.defaultLimit >= 0) {
    //       return cb(null, value);
    //     }
    //
    //     return cb('Invalid default limit value', null);
    //   }
    // },
    // graphql: {
    //   type: 'object',
    //   path: 'config/general.json',
    //   values: {
    //     object: {
    //       enabled: {
    //         type: 'boolean'
    //       },
    //       route: {
    //         type: 'string'
    //       }
    //     }
    //   }
    // }
  };

  return schema;
};

module.exports = SchemaGeneral;
