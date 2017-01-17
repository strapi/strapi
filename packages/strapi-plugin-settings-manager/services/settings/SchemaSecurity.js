'use strict';

/**
 * Schema security dependencies
 */

// Public node modules
const _ = require('lodash');
const validator = require('validator');

const SchemaSecurity = function(app) {
  const schema = {
    session: {
      type: ['boolean', 'object'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/security.json',
      values: {
        object: {
          key: {
            type: 'string'
          },
          secretKeys: {
            type: 'array'
          },
          maxAge: {
            type: 'integer'
          }
        }
      }
    },
    csrf: {
      type: ['boolean', 'object'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/security.json',
      values: {
        object: {
          key: {
            type: 'string'
          },
          secret: {
            type: 'string'
          }
        }
      }
    },
    csp: {
      type: ['boolean', 'object'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/security.json',
      values: {
        object: {
          reportOnly: {
            type: 'boolean'
          },
          reportUri: {
            type: 'string'
          }
        }
      },
      resolve: function(rootValue, value, scope, cb) {
        if (_.isObject(value)) {
          if (validator.isURL(value.reportUri)) {
            return cb(null, value);
          }

          return cb('ReportURI is not a valid URL', null);
        }

        return cb(null, value);
      }
    },
    hsts: {
      type: ['boolean', 'object'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/security.json',
      values: {
        object: {
          maxAge: {
            type: 'integer'
          },
          includeSubDomains: {
            type: 'boolean'
          }
        }
      }
    },
    xframe: {
      type: ['boolean', 'string'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/security.json'
    },
    xssProtection: {
      type: ['boolean', 'object'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/security.json',
      values: {
        object: {
          enabled: {
            type: 'boolean'
          },
          mode: {
            type: 'string'
          }
        }
      }
    },
    cors: {
      type: ['boolean', 'object'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/security.json',
      values: {
        object: {
          origin: {
            type: 'boolean'
          },
          expose: {
            type: 'array'
          },
          maxAge: {
            type: 'integer'
          },
          credentials: {
            type: 'boolean'
          },
          methods: {
            type: 'array'
          },
          headers: {
            type: 'array'
          }
        }
      }
    },
    ssl: {
      type: ['boolean', 'object'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/security.json',
      values: {
        object: {
          disabled: {
            type: 'boolean'
          },
          trustProxy: {
            type: 'boolean'
          }
        }
      }
    },
    ip: {
      type: 'object',
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/security.json',
      values: {
        object: {
          whiteList: {
            type: 'array'
          },
          blackList: {
            type: 'array'
          }
        }
      },
      resolver: function(rootValue, value, scope, cb) {
        var arrayOfWhiteIP = [];
        var arrayOfBlackIP = [];

        _.forEach(value.whiteList, function(whiteListIP) {
          if (!validator.isIP(whiteListIP) && !validator.isURL(whiteListIP)) {
            arrayOfWhiteIP.push(whiteListIP);
          }
        });

        _.forEach(value.blackList, function(blackListIP) {
          if (!validator.isIP(blackListIP) && !validator.isURL(blackListIP)) {
            arrayOfBlackIP.push(blackListIP);
          }
        });

        if (_.isEmpty(arrayOfBlackIP) && !_.isEmpty(arrayOfWhiteIP)) {
          return cb('Those whitelisted IP are invalid: ' + arrayOfWhiteIP.toString(), null);
        } else if (!_.isEmpty(arrayOfBlackIP) && _.isEmpty(arrayOfWhiteIP)) {
          return cb('Those blacklisted IP are invalid: ' + arrayOfBlackIP.toString(), null);
        } else if (!_.isEmpty(arrayOfBlackIP) && !_.isEmpty(arrayOfWhiteIP)) {
          return cb('Those blacklisted and whitelisted IP are invalid: ' + arrayOfBlackIP.toString() + arrayOfWhiteIP.toString(), null);
        }

        return cb(null, value);
      }
    },
    proxy: {
      type: ['boolean', 'string'],
      path: 'config/environments/' + app.currentUpdatedEnvironment + '/security.json',
      resolver: function(rootValue, value, scope, cb) {
        if (_.isString(value)) {
          if (validator.isURL(value) || validator.isIP(value)) {
            return cb(null, value);
          }

          return cb('Invalid proxy host', null);
        }

        return cb(null, value);
      }
    }
  };

  return schema;
};

module.exports = SchemaSecurity;
