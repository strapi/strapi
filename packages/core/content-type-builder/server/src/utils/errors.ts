import { errors } from '@strapi/utils';

/**
 * Formats an error caught during input validation for the legacy `{ error }` response body.
 *
 * A Strapi `ApplicationError` (e.g. a Yup `ValidationError`) serializes with its name, message
 * and details. A native `Error` (e.g. a `TypeError` thrown by a validator) does not: its
 * properties are not enumerable, so it serializes to `{}` and the message is lost.
 */
export const formatValidationError = (error: unknown) => {
  if (error instanceof errors.ApplicationError) {
    return error;
  }

  if (error instanceof Error) {
    return { name: error.name, message: error.message, details: {} };
  }

  return error;
};
