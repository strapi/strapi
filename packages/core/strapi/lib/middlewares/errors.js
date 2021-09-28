'use strict';

const _ = require('lodash');
const Boom = require('@hapi/boom');
const delegate = require('delegates');

const boomMethods = [
  'badRequest',
  'unauthorized',
  'paymentRequired',
  'forbidden',
  'notFound',
  'methodNotAllowed',
  'notAcceptable',
  'proxyAuthRequired',
  'clientTimeout',
  'conflict',
  'resourceGone',
  'lengthRequired',
  'preconditionFailed',
  'entityTooLarge',
  'uriTooLong',
  'unsupportedMediaType',
  'rangeNotSatisfiable',
  'expectationFailed',
  'teapot',
  'badData',
  'locked',
  'failedDependency',
  'preconditionRequired',
  'tooManyRequests',
  'illegal',
  'badImplementation',
  'notImplemented',
  'badGateway',
  'serverUnavailable',
  'gatewayTimeout',
];

const formatBoomPayload = boomError => {
  if (!Boom.isBoom(boomError)) {
    boomError = Boom.boomify(boomError, {
      statusCode: boomError.status || 500,
    });
  }

  const { output } = boomError;

  if (output.statusCode < 500 && !_.isNil(boomError.data)) {
    output.payload.data = boomError.data;
  }

  return { status: output.statusCode, body: output.payload };
};

/**
 * Create short responses ctx.(send|created|deleted)
 * @param {Strapi} strapi
 */
const createResponseUtils = strapi => {
  const delegator = delegate(strapi.server.app.context, 'response');

  boomMethods.forEach(method => {
    strapi.server.app.response[method] = function(msg, ...rest) {
      const boomError = Boom[method](msg, ...rest) || {};

      const { status, body } = formatBoomPayload(boomError);

      // keep retro-compatibility for old error formats
      body.message = msg || body.data || body.message;

      this.body = body;
      this.status = status;
    };

    delegator.method(method);
  });

  strapi.server.app.response.send = function(data, status = 200) {
    this.status = status;
    this.body = data;
  };

  strapi.server.app.response.created = function(data) {
    this.status = 201;
    this.body = data;
  };

  strapi.server.app.response.deleted = function(data) {
    if (_.isNil(data)) {
      this.status = 204;
    } else {
      this.status = 200;
      this.body = data;
    }
  };

  delegator
    .method('send')
    .method('created')
    .method('deleted');
};

/**
 * @type {import('./').MiddlewareFactory}
 */
module.exports = (options, { strapi }) => {
  createResponseUtils(strapi);
  strapi.errors = Boom;

  return async (ctx, next) => {
    try {
      // App logic.
      await next();

      if (_.isNil(ctx.body) && (_.isNil(ctx.status) || ctx.status === 404)) {
        ctx.notFound();
      }
    } catch (error) {
      // emit error if configured
      if (strapi.config.get('server.emitErrors', false)) {
        strapi.server.app.emit('error', error, ctx);
      }

      const { status, body } = formatBoomPayload(error);

      if (status >= 500) {
        strapi.log.error(error);
      }

      ctx.body = body;
      ctx.status = status;
    }
  };
};
