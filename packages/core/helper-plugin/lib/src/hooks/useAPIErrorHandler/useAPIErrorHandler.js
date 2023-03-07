import { useIntl } from 'react-intl';

import { formatAPIError } from './utils/formatAPIError';

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
      return formatAPIError(error, { intlMessagePrefixCallback, formatMessage });
    },
  };
}
