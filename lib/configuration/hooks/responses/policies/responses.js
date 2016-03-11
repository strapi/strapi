'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

// Local utilities.
const responses = require('../responses/index');

/**
 * Policy used to add responses in the `this.response` object.
 */

module.exports = function * (next) {
  // Add the custom responses to the `this.response` object.
  this.response = _.merge(this.response, responses);

  yield next;
};
