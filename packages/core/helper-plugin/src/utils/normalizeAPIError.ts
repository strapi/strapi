import { AxiosError } from 'axios';

import { getPrefixedId } from './getPrefixedId';

import type { errors } from '@strapi/utils';

interface NormalizeErrorOptions {
  name?: string;
  intlMessagePrefixCallback?: (id: string) => string;
}

type ApiError =
  | errors.ApplicationError
  | errors.ForbiddenError
  | errors.NotFoundError
  | errors.NotImplementedError
  | errors.PaginationError
  | errors.PayloadTooLargeError
  | errors.PolicyError
  | errors.RateLimitError
  | errors.UnauthorizedError
  | errors.ValidationError
  | errors.YupValidationError;

function normalizeError(
  error: ApiError | errors.YupFormattedError,
  { name, intlMessagePrefixCallback }: NormalizeErrorOptions
) {
  const { message } = error;

  const normalizedError = {
    id: getPrefixedId(message, intlMessagePrefixCallback),
    defaultMessage: message,
    name: error.name ?? name,
    values: {},
  };

  if ('path' in error) {
    normalizedError.values = { path: error.path.join('.') };
  }

  return normalizedError;
}

const validateErrorIsYupValidationError = (err: ApiError): err is errors.YupValidationError =>
  typeof err.details === 'object' && err.details !== null && 'errors' in err.details;

export function normalizeAPIError(
  apiError: AxiosError<{ error: ApiError }>,
  intlMessagePrefixCallback?: NormalizeErrorOptions['intlMessagePrefixCallback']
) {
  const error = apiError.response?.data.error;

  if (error) {
    // some errors carry multiple errors (such as ValidationError)
    if (validateErrorIsYupValidationError(error)) {
      return {
        name: error.name,
        message: error?.message || null,
        errors: error.details.errors.map((err) =>
          normalizeError(err, { name: error.name, intlMessagePrefixCallback })
        ),
      };
    }

    return normalizeError(error, { intlMessagePrefixCallback });
  }

  return null;
}
