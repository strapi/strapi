import { errors } from '@strapi/utils';

import { isDatabaseInputError } from '../../../utils/database-input-errors';
import type { Middleware } from './middleware-manager';

/**
 * Handle database errors
 */
export const databaseErrorsMiddleware: Middleware = async (ctx, next) => {
  try {
    return await next();
  } catch (error) {
    if (isDatabaseInputError(error) === true) {
      throw new errors.ValidationError(error.message);
    }
    throw error;
  }
};
