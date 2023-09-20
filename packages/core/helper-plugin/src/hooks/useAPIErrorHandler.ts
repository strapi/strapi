import { AxiosError } from 'axios';
import { IntlFormatters, useIntl } from 'react-intl';
import { ApiError } from 'types';

import { getPrefixedId } from '../utils/getPrefixedId';
import { NormalizeErrorOptions, normalizeAPIError } from '../utils/normalizeAPIError';

/**
 * Hook that exports an error message formatting function.
 */
export function useAPIErrorHandler(
  intlMessagePrefixCallback?: FormatAPIErrorOptions['intlMessagePrefixCallback']
) {
  const { formatMessage } = useIntl();

  return {
    formatAPIError(error: AxiosError<{ error: ApiError }>) {
      // Try to normalize the passed error first. This will fail for e.g. network
      // errors which are thrown by Axios directly.
      try {
        const formattedErr = formatAPIError(error, { intlMessagePrefixCallback, formatMessage });

        if (!formattedErr) {
          return formatAxiosError(error, { intlMessagePrefixCallback, formatMessage });
        }

        return formattedErr;
      } catch (_) {
        throw new Error('formatAPIError: Unknown error:', error);
      }
    },
  };
}

function formatAxiosError(
  error: AxiosError<unknown>,
  { intlMessagePrefixCallback, formatMessage }: FormatAPIErrorOptions
) {
  const { code, message } = error;

  return formatMessage(
    {
      id: getPrefixedId(message, intlMessagePrefixCallback),
      defaultMessage: message,
    },
    {
      code,
    }
  );
}

type FormatAPIErrorOptions = Partial<Pick<NormalizeErrorOptions, 'intlMessagePrefixCallback'>> &
  Pick<IntlFormatters, 'formatMessage'>;

/**
 * Method to stringify an API error object
 */
function formatAPIError(
  error: AxiosError<{ error: ApiError }>,
  { formatMessage, intlMessagePrefixCallback }: FormatAPIErrorOptions
) {
  if (!formatMessage) {
    throw new Error('The formatMessage callback is a mandatory argument.');
  }

  const normalizedError = normalizeAPIError(error, intlMessagePrefixCallback);

  if (!normalizedError) {
    return null;
  }

  if ('message' in normalizedError && normalizedError.message !== null) {
    return normalizedError.message;
  }

  // stringify multiple errors
  if ('errors' in normalizedError) {
    return normalizedError.errors
      .map(({ id, defaultMessage, values }) => formatMessage({ id, defaultMessage }, values))
      .join('\n');
  }

  return formatMessage(normalizedError);
}
