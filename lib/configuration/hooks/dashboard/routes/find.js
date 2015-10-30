'use strict';

/**
 * Module dependencies
 */

// Local node modules.
const routeService = require('./helpers');

/**
 * Returns the config of the application used
 * by the dashboard
 */

module.exports = function * () {
  try {
    const routes = yield routeService.find();
    this.body = routes;
  } catch (err) {
    this.status = 500;
    this.body = err;
  }
};
