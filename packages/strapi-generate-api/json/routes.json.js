'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');

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
    let current;

    try {
      // Copy current routes.json
      current = require(scope.rootPath);

      // Remove current routes.json
      fs.unlinkSync(scope.rootPath);
    } catch (e) {
      // Fake existing routes
      current = {
        routes: []
      };
    }

    try {
      const newest = generateRoutes().routes;
      // Merge both array of routes, and remove identical routes
      _.set(current, 'routes', _.concat(newest, _.differenceWith(current.routes, newest, _.isEqual)));

      return current;
    } catch (e) {
      console.error(e);
      return;
    }
  }

  return generateRoutes();
};
