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
    _.mapValues(_.omit(Boom, ['create']), (fn) => (...rest) => {
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

    // Set context when no route is matched.
    if (_.get(ctx.request, 'route') === undefined) {
      ctx.notFound();
    }

    if (_.get(ctx.body, 'isBoom') || _.isError(ctx.body)) {
      ctx.throw();
    }
  } catch (error) {
    // Error object could be also in the context body...
    strapi.log.error(ctx.body || error);
    // Wrap error into a Boom's response
    const formattedError = _.get(ctx.body, 'isBoom') ? ctx.body || error.message : Boom.wrap(error, error.status, ctx.body || error.message);

    ctx.status = formattedError.output.statusCode || error.status || 500;
    ctx.body = formattedError.output.payload;
  }
};
