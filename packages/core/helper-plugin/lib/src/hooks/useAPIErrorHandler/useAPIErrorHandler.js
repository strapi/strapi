import { useIntl } from 'react-intl';

import { formatAPIError } from './utils/formatAPIError';

export function useAPIErrorHandler(intlMessagePrefixCallback) {
  const { formatMessage } = useIntl();

  return {
    formatAPIError(error) {
      return formatAPIError(error, { intlMessagePrefixCallback, formatMessage });
    },
  };
}
