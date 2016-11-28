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
 * Expose main routes of the generated API
 */

module.exports = scope => {
  return {
    routes: [{
      method: 'GET',
      path: '/ ' + scope.humanizeId,
      handler: scope.globalID + '.find',
      config: {
        policies: []
      }
    }, {
      method: 'GET',
      path: '/ ' + scope.humanizeId + '/:id',
      handler: scope.globalID + '.findOne',
      config: {
        policies: []
      }
    }, {
      method: 'POST',
      path: '/ ' + scope.humanizeId,
      handler: scope.globalID + '.create',
      config: {
        policies: []
      }
    }, {
      method: 'PUT',
      path: '/ ' + scope.humanizeId + '/:id',
      handler: scope.globalID + '.update',
      config: {
        policies: []
      }
    }, {
      method: 'DELETE',
      path: '/ ' + scope.humanizeId + '/:id',
      handler: scope.globalID + '.destroy',
      config: {
        policies: []
      }
    }]
  };
};
