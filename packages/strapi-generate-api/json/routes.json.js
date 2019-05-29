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
    const tokenID =
      scope.args.tpl && scope.args.tpl !== 'mongoose' ? 'id' : '_id';

    const routes = {
      routes: [
        {
          method: 'GET',
          path: '/' + scope.idPluralized,
          handler: scope.globalID + '.find',
          config: {
            policies: [],
          },
        },
        {
          method: 'GET',
          path: '/' + scope.idPluralized + '/count',
          handler: scope.globalID + '.count',
          config: {
            policies: [],
          },
        },
        {
          method: 'GET',
          path: '/' + scope.idPluralized + '/:' + tokenID,
          handler: scope.globalID + '.findOne',
          config: {
            policies: [],
          },
        },
        {
          method: 'POST',
          path: '/' + scope.idPluralized,
          handler: scope.globalID + '.create',
          config: {
            policies: [],
          },
        },
        {
          method: 'PUT',
          path: '/' + scope.idPluralized + '/:' + tokenID,
          handler: scope.globalID + '.update',
          config: {
            policies: [],
          },
        },
        {
          method: 'DELETE',
          path: '/' + scope.idPluralized + '/:' + tokenID,
          handler: scope.globalID + '.delete',
          config: {
            policies: [],
          },
        }
      ],
    };

    return routes;
  }

  // We have to delete current file
  if (!_.isEmpty(scope.parentId)) {
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
