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
    const routes = {
      routes: [
        {
          method: 'GET',
          path: '/' + scope.route,
          handler: scope.name + '.find',
          config: {
            policies: [],
          },
        },
        {
          method: 'GET',
          path: '/' + scope.route + '/count',
          handler: scope.name + '.count',
          config: {
            policies: [],
          },
        },
        {
          method: 'GET',
          path: '/' + scope.route + '/:id',
          handler: scope.name + '.findOne',
          config: {
            policies: [],
          },
        },
        {
          method: 'POST',
          path: '/' + scope.route,
          handler: scope.name + '.create',
          config: {
            policies: [],
          },
        },
        {
          method: 'PUT',
          path: '/' + scope.route + '/:id',
          handler: scope.name + '.update',
          config: {
            policies: [],
          },
        },
        {
          method: 'DELETE',
          path: '/' + scope.route + '/:id',
          handler: scope.name + '.delete',
          config: {
            policies: [],
          },
        },
      ],
    };

    return routes;
  }

  // We have to delete current file
  if (fs.existsSync(scope.rootPath)) {
    let current;

    try {
      // Copy current routes.json
      current = require(scope.rootPath);

      // Remove current routes.json
      fs.unlinkSync(scope.rootPath);
    } catch (e) {
      // Fake existing routes
      current = {
        routes: [],
      };
    }

    try {
      const newest = generateRoutes().routes;
      // Merge both array of routes, and remove identical routes
      _.set(
        current,
        'routes',
        _.concat(newest, _.differenceWith(current.routes, newest, _.isEqual))
      );

      return current;
    } catch (e) {
      console.error(e);
      return;
    }
  }

  return generateRoutes();
};
