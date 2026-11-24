import { errors } from '@strapi/utils';
import { errors as databaseErrors } from '@strapi/database';
import type { Core } from '@strapi/types';

import { formatApplicationError, formatHttpError, formatInternalError } from '../services/errors';
import { isDatabaseInputError } from '../utils/database-input-errors';
import { isClientDisconnected } from '../services/server/client-abort';

declare module 'koa' {
  interface BaseResponse {
    _explicitStatus: boolean;
  }
}

const errorMiddleware: Core.MiddlewareFactory = (/* _, { strapi } */) => {
  return async (ctx, next) => {
    try {
      await next();

      if (!ctx.response._explicitStatus) {
        return ctx.notFound();
      }
    } catch (error) {
      if (error instanceof errors.ApplicationError) {
        const { status, body } = formatApplicationError(error);
        ctx.status = status;
        ctx.body = body;
        return;
      }

      if (error instanceof errors.HttpError) {
        const { status, body } = formatHttpError(error);
        ctx.status = status;
        ctx.body = body;
        return;
      }

      // Routes that call strapi.db.query directly bypass the document and entity services,
      // so invalid input values reach this point as raw database errors.
      if (isDatabaseInputError(error) === true) {
        const { status, body } = formatApplicationError(new errors.ValidationError(error.message));
        ctx.status = status;
        ctx.body = body;
        return;
      }

      // The client is gone: nobody reads this response, and it is not a failure of the server. A
      // QueryAbortedError while it is still there is unexpected, so it is logged as one.
      if (
        error instanceof databaseErrors.QueryAbortedError &&
        strapi.db?.config?.settings?.abortReadsOnRequestDisconnect === true &&
        isClientDisconnected(ctx)
      ) {
        strapi.log.debug(`Request aborted before the query completed: ${error.message}`);
      } else {
        strapi.log.error(error);
      }

      const { status, body } = formatInternalError(error);
      ctx.status = status;
      ctx.body = body;
    }
  };
};

export { errorMiddleware as errors };
