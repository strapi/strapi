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
  let routes = [];
  if (!scope.args.plugin) {
    routes =
      scope.contentTypeKind === 'singleType'
        ? generateSingleTypeRoutes({ route: scope.route, name: scope.name })
        : generateCollectionTypeRoutes({ route: scope.route, name: scope.name });
  }

  // if routes.json already exists, then merge
  if (fs.existsSync(scope.rootPath)) {
    let current = require(scope.rootPath);
    fs.unlinkSync(scope.rootPath);
    routes = _.concat(routes, _.differenceWith(current.routes, routes, _.isEqual));
  }

  return { routes };
};
