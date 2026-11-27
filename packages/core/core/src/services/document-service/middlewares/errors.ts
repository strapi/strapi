import { errors } from '@strapi/utils';

import { isDatabaseInputError } from '../../../utils/database-input-errors';
import type { Middleware } from './middleware-manager';

/**
 * The document service reads `global.strapi`. `destroy()` deletes it, and a document service
 * created without `createStrapi()` (e.g. in a unit test) never has it, so a call fails with
 * "strapi is not defined". Only that missing binding matches: any other reference
 * error is a bug of its own and is rethrown unchanged.
 */
export const isStrapiUnavailableError = (error: unknown) =>
  error instanceof ReferenceError &&
  error.message === 'strapi is not defined' &&
  (globalThis as { strapi?: unknown }).strapi === undefined;

/**
 * @param call - the document service call that failed, e.g. `strapi.documents('<uid>')`
 */
export const createStrapiUnavailableError = (call: string, cause: unknown) =>
  new Error(
    `Cannot run ${call}: Strapi is not available (it was destroyed or never created). ` +
      'The document service needs a loaded Strapi instance.',
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

    if (isStrapiUnavailableError(error) === true) {
      throw createStrapiUnavailableError(`strapi.documents('${ctx.uid}').${ctx.action}()`, error);
    }

    throw error;
  }
};
