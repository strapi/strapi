'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

module.exports = {
  find: find,
  update: update
};

/**
 * Find routes.
 *
 * @returns {Function|promise}
 */
function * find() {

  const deferred = Promise.defer();

  try {
    const verbs = ['get', 'put', 'post', 'delete', 'options', 'patch'];
    const routes = {};
    const dbRoutes = yield strapi.orm.collections.route.find().populate('roles');
    const apis = strapi.api;
    let dbRoute;
    let index;
    let firstWord;
    let routeNameSplitted;
    let verb;

    // Format verb.
    _.forEach(dbRoutes, function (route) {
      // Split the name with `/`.
      routeNameSplitted = route.name.split('/');

      // Verb.
      verb = _.includes(verbs, routeNameSplitted[0] && _.trim(routeNameSplitted[0].toLowerCase())) ? _.trim(routeNameSplitted[0]) : '';
      route.verb = verb;

      route.path = route.verb ? routeNameSplitted.splice(0, 1) && _.trim('/' + routeNameSplitted.join('/')) : _.trim(routeNameSplitted.join('/'));
    });

    // For each API.
    _.forEach(apis, function (api, key) {
      // Init the array object.
      routes[key] = [];

      // For each routes of the current API.
      _.forEach(api.config.routes, function (route, routeName) {
        // Find routes of the APIs in the `routes` object.
        dbRoute = _.find(dbRoutes, {name: routeName});
        // If the route is found.
        if (dbRoute) {
          // Find the index.
          index = _.indexOf(dbRoutes, dbRoute);

          // Assign them to the key of the `route` object.
          routes[key].push(dbRoute);

          // Remove the pushed route from the list of routes.
          dbRoutes.splice(index, 1);
        }
      });
    });

    // Then filter by `begin` with.
    _.forEach(_.clone(dbRoutes), function (route) {
      // Prevent errors.
      if (!route) {
        return;
      }

      // Split the name with `/`.
      routeNameSplitted = route.name.split('/');

      // Fetch the first word of the URL.
      firstWord = route.verb ? _.trim(routeNameSplitted[1]) : _.trim(routeNameSplitted[0]);

      // Set an empty array for this object if it is not
      // already defined.
      routes[firstWord] = routes[firstWord] || [];

      // Set the index value.
      index = _.indexOf(dbRoutes, route);

      // Assign them to the key of the `route` object.
      routes[firstWord].push(_.clone(route));

      // Remove the pushed route from the list of routes.
      dbRoutes.splice(index, 1);
    });

    // Set the non-filtered routes in the `others` object.
    if (dbRoutes.length) {
      routes.others = dbRoutes;
    }

    deferred.resolve(routes);
  } catch (err) {
    deferred.reject(err);
  }

  return deferred.promise;
}

/**
 * Update routes.
 *
 * @param routes
 * @returns {Function|promise}
 */
function * update(routes) {
  let id;
  const promises = [];
  const deferred = Promise.defer();

  _.forEach(routes, function (route) {
    id = route.id;
    promises.push(strapi.orm.collections.route.update({id: id}, route));
  });

  Promise.all(promises)
    .then(function (results) {
      deferred.resolve(results);
    })
    .catch(function (error) {
      deferred.reject(error);
    });

  return deferred.promise;
}
