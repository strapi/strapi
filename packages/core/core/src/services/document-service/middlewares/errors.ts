import { errors as databaseErrors } from '@strapi/database';
import { errors } from '@strapi/utils';

import type { Middleware } from './middleware-manager';

const databaseErrorsToTransform = [
  databaseErrors.InvalidTimeError,
  databaseErrors.InvalidDateTimeError,
  databaseErrors.InvalidDateError,
  databaseErrors.InvalidRelationError,
];

/**
 * Handle database errors
 */
export const databaseErrorsMiddleware: Middleware = async (ctx, next) => {
  try {
    return await next();
  } catch (error) {
    if (databaseErrorsToTransform.some((errorToTransform) => error instanceof errorToTransform)) {
      if (error instanceof Error) {
        throw new errors.ValidationError(error.message);
      }

      throw error;
    }
    throw error;
  }
};
