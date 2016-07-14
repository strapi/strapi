'use strict';

/**
 * `exposeGlobals()`
 *
 * Expose certain global variables.
 *
 * @api private
 */

module.exports = cb => {
  global.async = require('async');
  global._ = require('lodash');
  global.strapi = this;

  return cb();
};
