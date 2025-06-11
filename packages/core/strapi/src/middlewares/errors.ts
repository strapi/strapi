import { errors } from '@strapi/utils';
import type { Common } from '@strapi/types';

import { formatApplicationError, formatHttpError, formatInternalError } from '../services/errors';

/**
 * NOTE: In the v5 branch, this error.name check is not needed.
 * This is a temporary workaround to cover a deeper bug elsewhere in the code.
 *
 * The real issue is likely that somewhere a ValidationError is being created
 * that does not pass instanceof errors.ApplicationError, despite actually being an ApplicationError.
 *
 * This workaround is included only because v4 is in maintenance mode and this is a safe fix.
 * It does not address the root cause of the problem.
 */
export function isErrorOfTypeOrSubclass<T>(
  error: any,
  constructor: { new (...args: any[]): T }
): error is T {
  let proto = error?.constructor;
  while (proto) {
    if (proto.name === constructor.name) {
      return true;
    }
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

const errorMiddleware: Common.MiddlewareFactory = (/* _, { strapi } */) => {
  return async (ctx, next) => {
    try {
      await next();

      if (!ctx.response._explicitStatus) {
        return ctx.notFound();
      }
    } catch (error) {
      if (isErrorOfTypeOrSubclass(error, errors.ApplicationError)) {
        const { status, body } = formatApplicationError(error);
        ctx.status = status;
        ctx.body = body;
        return;
      }

      if (isErrorOfTypeOrSubclass(error, errors.HttpError)) {
        const { status, body } = formatHttpError(error);
        ctx.status = status;
        ctx.body = body;
        return;
      }

      strapi.log.error(error);

      const { status, body } = formatInternalError(error);
      ctx.status = status;
      ctx.body = body;
    }
  };
};

export { errorMiddleware as errors };
