import type { errors } from '@strapi/utils';
import type { FetchError } from '@strapi/admin/strapi-admin';

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

interface YupFormattedError {
  path: string[];
  message: string;
  name: string;
}

interface NormalizeErrorOptions {
  name?: string;
  intlMessagePrefixCallback?: (id: string) => string;
}

function getPrefixedId(message: string, callback?: (prefixedMessage: string) => string) {
  const prefixedMessage = `apiError.${message}`;

  // if a prefix function has been passed in it is used to
  // prefix the id, e.g. to allow an error message to be
  // set only for a localization namespace
  if (typeof callback === 'function') {
    return callback(prefixedMessage);
  }

  return prefixedMessage;
}

function normalizeError(
  error: ApiError | YupFormattedError,
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

const validateErrorIsYupValidationError = (err: ApiError) =>
  typeof err.details === 'object' && err.details !== null && 'errors' in err.details;

export function normalizeAPIError(
  apiError: FetchError,
  intlMessagePrefixCallback?: NormalizeErrorOptions['intlMessagePrefixCallback']
) {
  const error = apiError.response?.data.error;

  if (error) {
    // some errors carry multiple errors (such as ValidationError)
    if (validateErrorIsYupValidationError(error)) {
      const details = error.details as { errors: YupFormattedError[] };
      return {
        name: error.name,
        message: error?.message || null,
        errors: details.errors.map((err) =>
          normalizeError(err, { name: error.name, intlMessagePrefixCallback })
        ),
      };
    }

    return normalizeError(error, { intlMessagePrefixCallback });
  }

  return null;
}
