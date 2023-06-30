import { normalizeAPIError } from '../normalizeAPIError';

/**
 * Method to stringify an API error object
 *
 * @export
 * @param {object} API Reponse error object
 * @param {{ formatMessage: Function, intlMessagePrefixCallback: Function }} - Object containing a formatMessage (from react-intl) callback and an intlMessagePrefixCallback (usually getTrad()
 * @return {string} Stringified response error
 */

export function formatAPIError(error, { formatMessage, intlMessagePrefixCallback }) {
  if (!formatMessage) {
    throw new Error('The formatMessage callback is a mandatory argument.');
  }

  const normalizedError = normalizeAPIError(error, intlMessagePrefixCallback);

  // stringify multiple errors
  if (normalizedError?.errors) {
    return normalizedError.errors
      .map(({ id, defaultMessage, values }) => formatMessage({ id, defaultMessage }, values))
      .join('\n');
  }

  return formatMessage(normalizedError);
}
