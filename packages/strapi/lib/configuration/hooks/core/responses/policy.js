'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const Boom = require('boom');

// Local utilities.
const responses = require('./responses/index');

/**
 * Policy used to add responses in the `this.response` object.
 */

module.exports = async function (ctx, next) {
  // Add the custom responses to the `ctx` object.
  _.merge(ctx, responses, Boom);

  await next();
};
