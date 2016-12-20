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
  function generateRoutes() {
    return {
      routes: [{
        method: 'GET',
        path: '/' + (scope.humanizeSubId || scope.humanizeId),
        handler: scope.globalID + '.find',
        config: {
          policies: []
        }
      }, {
        method: 'GET',
        path: '/' + (scope.humanizeSubId || scope.humanizeId) + '/:id',
        handler: scope.globalID + '.findOne',
        config: {
          policies: []
        }
      }, {
        method: 'POST',
        path: '/' + (scope.humanizeSubId || scope.humanizeId),
        handler: scope.globalID + '.create',
        config: {
          policies: []
        }
      }, {
        method: 'PUT',
        path: '/' + (scope.humanizeSubId || scope.humanizeId) + '/:id',
        handler: scope.globalID + '.update',
        config: {
          policies: []
        }
      }, {
        method: 'DELETE',
        path: '/' + (scope.humanizeSubId || scope.humanizeId) + '/:id',
        handler: scope.globalID + '.destroy',
        config: {
          policies: []
        }
      }]
    };
  }

  // We have to delete current file
  if (!_.isEmpty(scope.subId)) {
    const current = require(scope.rootPath);

    try {
      // Remove current routes.json
      fs.unlinkSync(scope.rootPath);
      // Merge both array of routes
      current.routes = _.concat(generateRoutes().routes, current.routes);

      return current;
    } catch (e) {
      console.error(e);
      return;
    }
  }

  return generateRoutes();
};
