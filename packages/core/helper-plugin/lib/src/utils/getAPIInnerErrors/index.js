import { normalizeAPIError } from '../../hooks/useAPIErrorHandler';

/**
 *
 * Returns a normalized error message
 *
 * @deprecated
 * @export
 * @param {error} error - API error response object
 * @param {{ getTrad }} - Error message prefix callback
 * @return {{ id: string, defaultMessage: string }}}
 */
export default function getAPIInnerErrors(error, { getTrad }) {
  const normalizedError = normalizeAPIError(error, getTrad);

  if (normalizedError?.errors) {
    return normalizedError.errors.reduce((acc, error) => {
      acc[error.values.path] = {
        id: error.id,
        defaultMessage: error.defaultMessage,
      };

      return acc;
    }, {});
  }

  return normalizedError.defaultMessage;
}
