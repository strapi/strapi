'use strict';

/**
 * `exposeGlobals()`
 *
 * Expose certain global variables.
 *
 * @api private
 */

module.exports = function exposeGlobals() {
  global.async = require('async');
  global._ = require('lodash');

  console.log(this);

  global.strapi = this;
};
