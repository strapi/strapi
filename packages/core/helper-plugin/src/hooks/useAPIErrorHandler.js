import { AxiosError } from 'axios';
import { useIntl } from 'react-intl';

import { getPrefixedId } from '../utils/getPrefixedId';
import { normalizeAPIError } from '../utils/normalizeAPIError';

/**
 * Hook that exports an error message formatting function.
 *
 * @export
 * @param {function} - Error message prefix function (usually getTrad())
 * @return {{ formatAPIError }} - Object containing an formatting function
 */

export function useAPIErrorHandler(intlMessagePrefixCallback) {
  const { formatMessage } = useIntl();

  return {
    formatAPIError(error) {
      // Try to normalize the passed error first. This will fail for e.g. network
      // errors which are thrown by Axios directly.
      try {
        return formatAPIError(error, { intlMessagePrefixCallback, formatMessage });
      } catch (_) {
        if (error instanceof AxiosError) {
          return formatAxiosError(error, { intlMessagePrefixCallback, formatMessage });
        }

        throw new Error('formatAPIError: Unknown error:', error);
      }
    },
  };
}

function formatAxiosError(error, { intlMessagePrefixCallback, formatMessage }) {
  const { code, message } = error;

  return formatMessage({
    id: getPrefixedId(message, intlMessagePrefixCallback),
    defaultMessage: message,
    values: {
      code,
    },
  });
}

/**
 * Method to stringify an API error object
 *
 * @export
 * @param {object} API Reponse error object
 * @param {{ formatMessage: Function, intlMessagePrefixCallback: Function }} - Object containing a formatMessage (from react-intl) callback and an intlMessagePrefixCallback (usually getTrad()
 * @return {string} Stringified response error
 */

function formatAPIError(error, { formatMessage, intlMessagePrefixCallback }) {
  if (!formatMessage) {
    throw new Error('The formatMessage callback is a mandatory argument.');
  }

  const normalizedError = normalizeAPIError(error, intlMessagePrefixCallback);

  if (normalizedError.message) {
    return normalizedError.message;
  }

  // stringify multiple errors
  if (normalizedError?.errors) {
    return normalizedError.errors
      .map(({ id, defaultMessage, values }) => formatMessage({ id, defaultMessage }, values))
      .join('\n');
  }

  return formatMessage(normalizedError);
}
