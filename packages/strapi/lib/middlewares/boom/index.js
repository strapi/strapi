'use strict';

/**
 * Boom hook
 */

// Public node modules.
const _ = require('lodash');
const Boom = require('boom');
const delegate = require('delegates');

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
          if (
            _.get(strapi, 'config.currentEnvironment.server.emitErrors', false)
          ) {
            strapi.app.emit('error', error, ctx);
          }

          // Log error.
          strapi.log.error(error);

          // if the error is a boom error (e.g throw strapi.errors.badRequest)
          if (error.isBoom) {
            ctx.status = error.output.statusCode;
            ctx.body = error.output.payload;
          } else {
            // Wrap error into a Boom's response.
            ctx.status = error.status || 500;
            ctx.body = _.get(ctx.body, 'isBoom')
              ? ctx.body || (error && error.message)
              : Boom.wrap(error, ctx.status);
          }
        }

        if (ctx.response.headers.location) {
          return;
        }

        // Empty body is considered as `notFound` response.
        if (!ctx.body && ctx.body !== 0) {
          ctx.notFound();
        }

        if (ctx.body.isBoom && ctx.body.data) {
          ctx.body.output.payload.message = ctx.body.data;
        }

        // Format `ctx.body` and `ctx.status`.
        ctx.status = ctx.body.isBoom ? ctx.body.output.statusCode : ctx.status;
        ctx.body = ctx.body.isBoom ? ctx.body.output.payload : ctx.body;
      });
    },

    // Custom function to avoid ctx.body repeat
    createResponses() {
      Object.keys(Boom).forEach(key => {
        strapi.app.response[key] = function(...rest) {
          const error = Boom[key](...rest) || {};

          this.status = error.isBoom ? error.output.statusCode : this.status;
          this.body = error;
        };

        this.delegator.method(key);
      });

      strapi.app.response.send = function(data) {
        this.status = 200;
        this.body = data;
      };

      strapi.app.response.created = function(data) {
        this.status = 201;
        this.body = data;
      };

      this.delegator.method('send').method('created');
    },
  };
};
