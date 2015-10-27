'use strict';

/**
 * Module dependencies
 */

// Local node modules.
const routeService = require('./helpers');

/**
 * Returns the config of the application used
 * by the admin panel
 */

module.exports = function *() {
  let routes;
  let routesFound;

  try {
    routes = this.request.body;
    yield routeService.update(routes);
    routesFound = yield routeService.find();
    this.body = routesFound;
  } catch (err) {
    this.status = 500;
    this.body = err;
  }
};
