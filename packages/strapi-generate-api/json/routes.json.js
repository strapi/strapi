'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');

// Public node modules.
const _ = require('lodash');

function generateSingleTypeRoutes({ route, name }) {
  return [
    {
      method: 'GET',
      path: '/' + route,
      handler: name + '.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/' + route,
      handler: name + '.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/' + route,
      handler: name + '.delete',
      config: {
        policies: [],
      },
    },
  ];
}

function generateCollectionTypeRoutes({ route, name }) {
  return [
    {
      method: 'GET',
      path: '/' + route,
      handler: name + '.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/' + route + '/count',
      handler: name + '.count',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/' + route + '/:id',
      handler: name + '.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/' + route,
      handler: name + '.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/' + route + '/:id',
      handler: name + '.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/' + route + '/:id',
      handler: name + '.delete',
      config: {
        policies: [],
      },
    },
  ];
}

/**
 * Expose main routes of the generated API
 */

module.exports = scope => {
  console.log(scope.contentTypeKind);

  const routes =
    scope.contentTypeKind === 'singleType'
      ? generateSingleTypeRoutes({
          route: scope.route,
          name: scope.name,
        })
      : generateCollectionTypeRoutes({
          route: scope.route,
          name: scope.name,
        });

  // We have to delete current file
  if (fs.existsSync(scope.rootPath)) {
    let current;

    try {
      // Copy current routes.json
      current = require(scope.rootPath);

      // Remove current routes.json
      fs.unlinkSync(scope.rootPath);
    } catch (e) {
      console.error(e);
      current = {
        routes: [],
      };
    }

    try {
      _.set(
        current,
        'routes',
        _.concat(routes, _.differenceWith(current.routes, routes, _.isEqual))
      );

      return current;
    } catch (e) {
      console.error(e);
      return;
    }
  }

  return { routes };
};
