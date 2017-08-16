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
    _.mapValues(_.omit(Boom, ['create']), fn => (...rest) => {
      ctx.body = fn(...rest);
    })
  );
};

/**
 * Policy used to add responses in the `this.response` object.
 */

module.exports = async function(ctx, next) {
  const delegator = delegate(ctx, 'response');

  _.forEach(createResponses(ctx), (value, key) => {
    // Assign new error methods to context.response
    ctx.response[key] = value;
    // Delegate error methods to context
    delegator.method(key);
  });

  try {
    // App logic.
    await next();
  } catch (error) {
    // Log error.
    strapi.log.error(error);

    // Wrap error into a Boom's response.
    ctx.status = error.status || 500;
    ctx.body = _.get(ctx.body, 'isBoom')
      ? ctx.body || error && error.message
      : Boom.wrap(error, ctx.status, ctx.body || error.message);
  }

  // Empty body is considered as `notFound` response.
  if (_.isUndefined(ctx.body) && _.isUndefined(ctx.status)) {
    ctx.notFound();
  }

  if (_.isObject(ctx.body)) {
    if (ctx.body.isBoom && ctx.body.data) {
      ctx.body.output.payload.data = ctx.body.data;
    }

    // Format `ctx.body` and `ctx.status`.
    ctx.status = ctx.body.isBoom ? ctx.body.output.statusCode : ctx.status;
    ctx.body = ctx.body.isBoom ? ctx.body.output.payload : ctx.body;
  }

  // Call custom responses.
  if (_.isFunction(_.get(strapi.config, `functions.responses.${ctx.status}`))) {
    await strapi.config.functions.responses[ctx.status].call(this, ctx);
  }
};
