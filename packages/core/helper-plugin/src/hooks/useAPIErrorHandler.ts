import { AxiosError } from 'axios';
import { useIntl, type IntlFormatters, MessageDescriptor } from 'react-intl';

import { getPrefixedId } from '../utils/getPrefixedId';
import { normalizeAPIError } from '../utils/normalizeAPIError';

/**
 * Hook that exports an error message formatting function.
 *
 * @export
 * @param {function} - Error message prefix function (usually getTrad())
 * @return {{ formatAPIError }} - Object containing an formatting function
 */
export function useAPIErrorHandler(intlMessagePrefixCallback?: (prefix?: string) => string) {
  const { formatMessage } = useIntl();

  return {
    formatAPIError(error: unknown) {
      // Try to normalize the passed error first. This will fail for e.g. network
      // errors which are thrown by Axios directly.
      try {
        return formatAPIError(error, { intlMessagePrefixCallback, formatMessage });
      } catch (_) {
        if (error instanceof AxiosError) {
          return formatAxiosError(error, { intlMessagePrefixCallback, formatMessage });
        }

        throw new Error(`formatAPIError: Unknown error: ${error}`);
      }
    },
  };
}

type ExtendedFormatMessageFn = (
  // Overriding `descriptor` prop
  descriptor: MessageDescriptor & {
    values?: Record<string, unknown>;
  },
  ...baseParams: Partial<Parameters<IntlFormatters['formatMessage']>>
) => string;

function formatAxiosError(
  error: AxiosError,
  {
    intlMessagePrefixCallback,
    formatMessage,
  }: {
    intlMessagePrefixCallback?: (prefix?: string) => string;
    formatMessage: ExtendedFormatMessageFn;
  }
): string {
  const { code, message } = error;

  return formatMessage({
    id: getPrefixedId(message, intlMessagePrefixCallback),
    defaultMessage: message,
    values: { code },
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
function formatAPIError(
  error: unknown,
  {
    intlMessagePrefixCallback,
    formatMessage,
  }: {
    intlMessagePrefixCallback?: (prefix?: string) => string;
    formatMessage: ExtendedFormatMessageFn;
  }
): string {
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
      .map(({ id, defaultMessage, values }: ReturnType<typeof normalizeAPIError>) =>
        formatMessage({ id, defaultMessage }, values)
      )
      .join('\n');
  }

  return formatMessage(normalizedError);
}
