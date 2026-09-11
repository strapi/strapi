import { useIntl } from 'react-intl';

import { BaseQueryError, isBaseQueryError } from '../utils/baseQuery';

import { useAPIErrorHandler } from './useAPIErrorHandler';

import type { SerializedError } from '@reduxjs/toolkit';

/** A `SerializedError` (a thrown exception, not a server response) carries nothing safe to show
 * verbatim, so it falls back to a generic message. */
const useToMessage = () => {
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  return (err: BaseQueryError | SerializedError) =>
    isBaseQueryError(err)
      ? formatAPIError(err)
      : formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' });
};

export { useToMessage };
