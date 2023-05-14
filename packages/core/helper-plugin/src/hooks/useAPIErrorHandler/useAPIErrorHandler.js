import { useIntl } from 'react-intl';
import { AxiosError } from 'axios';

import { formatAPIError } from './utils/formatAPIError';
import { formatAxiosError } from './utils/formatAxiosError';

/**
 * Hook that exports an error message formatting function.
 *
 * @export
 * @param {function=} - Error message prefix function (usually getTrad())
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
