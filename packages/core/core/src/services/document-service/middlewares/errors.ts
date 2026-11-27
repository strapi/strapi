import { errors } from '@strapi/utils';

import { isDatabaseInputError } from '../../../utils/database-input-errors';
import type { Middleware } from './middleware-manager';

/**
 * `destroy()` deletes `global.strapi`, which the document service reads, so a call made after it
 * fails with "strapi is not defined". Only that missing binding matches: any other reference
 * error is a bug of its own and is rethrown unchanged.
 */
export const isStrapiDestroyedError = (error: unknown) =>
  error instanceof ReferenceError &&
  error.message === 'strapi is not defined' &&
  (globalThis as { strapi?: unknown }).strapi === undefined;

/**
 * @param call - the document service call that failed, e.g. `strapi.documents('<uid>')`
 */
export const createStrapiDestroyedError = (call: string, cause: unknown) =>
  new Error(
    `Cannot run ${call}: Strapi was destroyed. The document service needs a loaded Strapi instance.`,
    { cause }
  );

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
      throw createStrapiDestroyedError(`strapi.documents('${ctx.uid}').${ctx.action}()`, error);
    }

    throw error;
  }
};
