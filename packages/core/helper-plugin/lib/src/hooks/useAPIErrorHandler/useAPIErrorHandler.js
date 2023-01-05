import { useIntl } from 'react-intl';

import { formatAPIError } from './utils/formatAPIError';

export function useAPIErrorHandler(getTrad) {
  const { formatMessage } = useIntl();

  return {
    formatAPIError(error) {
      return formatAPIError(error, { getTrad, formatMessage });
    },
  };
}
