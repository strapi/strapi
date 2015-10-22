'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Local node modules.
const routeService = require('./helpers');

/**
 * Returns the config of the application used
 * by the admin panel
 */

module.exports = function * () {
  let routes;

  try {
    routes = yield routeService.find();

    this.body = routes;
  } catch (err) {
    this.status = 500;
    this.body = err;
  }
};
