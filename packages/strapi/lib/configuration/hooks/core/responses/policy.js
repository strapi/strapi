'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const Boom = require('boom');
const delegate = require('delegates');

// Local utilities.
const responses = require('./responses/index');

// Custom function to avoid ctx.body repeat
const createResponses = ctx => {
  return _.merge(
    responses,
    _.mapValues(_.omit(Boom, ['wrap', 'create']), (fn) => (...rest) => {
      ctx.body = fn(...rest);
    })
  );
};

/**
 * Policy used to add responses in the `this.response` object.
 */

module.exports = async function (ctx, next) {
  const delegator = delegate(ctx, 'response');

  _.forEach(createResponses(ctx), (value, key) => {
    // Assign new error methods to context.response
    ctx.response[key] = value;
    // Delegate error methods to context
    delegator.method(key);
  });

  try {
    await next();

    if (_.get(ctx.body, 'isBoom')) {
      ctx.throw(ctx.status);
    }
  } catch (error) {
    strapi.log.error(error);
    const formattedError = _.get(ctx.body, 'isBoom') ? ctx.body : Boom.wrap(error, error.status, ctx.body);

    ctx.status = formattedError.output.statusCode || error.status || 500;
    ctx.body = formattedError.output.payload;
  }
};
