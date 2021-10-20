'use strict';

const { HttpError, ApplicationError } = require('@strapi/utils').errors;
const { DatabaseError } = require('@strapi/database').errors;
const {
  formatApplicationError,
  formatHttpError,
  formatInternalError,
  formatDatabaseError,
} = require('../services/errors');

module.exports = (/* _, { strapi } */) => {
  return async (ctx, next) => {
    try {
      await next();

      if (!ctx.response._explicitStatus) {
        return ctx.notFound();
      }
    } catch (error) {
      if (error instanceof ApplicationError) {
        const { status, body } = formatApplicationError(error);
        ctx.status = status;
        ctx.body = body;
        return;
      }

      if (error instanceof HttpError) {
        const { status, body } = formatHttpError(error);
        ctx.status = status;
        ctx.body = body;
        return;
      }

      // TODO: to handle directly in the controllers
      if (error instanceof DatabaseError) {
        const { status, body } = formatDatabaseError(error);
        ctx.status = status;
        ctx.body = body;
        return;
      }

      strapi.log.error(error);

      const { status, body } = formatInternalError();
      ctx.status = status;
      ctx.body = body;
    }
  };
};
