import { errors } from '@strapi/utils';

import { isDatabaseInputError } from '../../../utils/database-input-errors';
import type { Middleware } from './middleware-manager';

/**
 * `destroy()` deletes `global.strapi`, which the document service reads, so a call made after it
 * fails with "strapi is not defined".
 */
const isStrapiDestroyedError = (error: unknown) =>
  error instanceof ReferenceError && (globalThis as { strapi?: unknown }).strapi === undefined;

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

    if (isStrapiDestroyedError(error) === true) {
      throw new Error(
        `Cannot run strapi.documents('${ctx.uid}').${ctx.action}(): Strapi was destroyed. ` +
          'The document service needs a loaded Strapi instance.',
        { cause: error }
      );
    }

    throw error;
  }
};
