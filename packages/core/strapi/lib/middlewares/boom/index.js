'use strict';

/**
 * Boom hook
 */

// Public node modules.
const _ = require('lodash');
const Boom = require('boom');
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

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      this.delegator = delegate(strapi.app.context, 'response');
      this.createResponses();

      strapi.errors = Boom;
      strapi.app.use(async (ctx, next) => {
        try {
          // App logic.
          await next();
        } catch (error) {
          // emit error if configured
          if (strapi.config.get('server.emitErrors', false)) {
            strapi.app.emit('error', error, ctx);
          }

          // Log error.

          const { status, body } = formatBoomPayload(error);

          if (status >= 500) {
            strapi.log.error(error);
          }

          ctx.body = body;
          ctx.status = status;
        }
      });

      strapi.app.use(async (ctx, next) => {
        await next();
        // Empty body is considered as `notFound` response.
        if (_.isNil(ctx.body) && _.isNil(ctx.status)) {
          ctx.notFound();
        }
      });
    },

    // Custom function to avoid ctx.body repeat
    createResponses() {
      boomMethods.forEach(method => {
        strapi.app.response[method] = function(msg, ...rest) {
          const boomError = Boom[method](msg, ...rest) || {};

          const { status, body } = formatBoomPayload(boomError);

          // keep retro-compatibility for old error formats
          body.message = msg || body.data || body.message;

          this.body = body;
          this.status = status;
        };

        this.delegator.method(method);
      });

      strapi.app.response.send = function(data, status = 200) {
        this.status = status;
        this.body = data;
      };

      strapi.app.response.created = function(data) {
        this.status = 201;
        this.body = data;
      };

      strapi.app.response.deleted = function(data) {
        if (_.isNil(data)) {
          this.status = 204;
        } else {
          this.status = 200;
          this.body = data;
        }
      };

      this.delegator
        .method('send')
        .method('created')
        .method('deleted');
    },
  };
};
