import { normalizeAPIError } from './normalizeAPIError';

/**
 *
 * Returns a normalized error message
 *
 */
function getAPIInnerErrors(error, { getTrad }) {
  const normalizedError = normalizeAPIError(error, getTrad);

  if (normalizedError && 'errors' in normalizedError) {
    return normalizedError.errors.reduce((acc, error) => {
      if ('path' in error.values) {
        acc[error.values.path] = {
          id: error.id,
          defaultMessage: error.defaultMessage,
        };
      }

      return acc;
    }, {});
  }

  return normalizedError?.defaultMessage;
}

export default getAPIInnerErrors;
