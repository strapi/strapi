import { errors } from '@strapi/utils';
import type { Common } from '@strapi/types';

import { formatApplicationError, formatHttpError, formatInternalError } from '../services/errors';

// NOTE: The error.name check is not necessary in the v5 branch!
// Therefore it should be considered a hack workaround for an actual bug which means that there is a bug
// somewhere else in the code.
// The issue is most likely somewhere where ValidationErrors are being created that are not
// instanceof errors.ApplicationError despite actually being ApplicationErrors.
//
// This code is only included because v4 is in maintenance mode and this is a safe fix, but does not solve the
// root cause of the problem.
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
