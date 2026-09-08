import { useIntl } from 'react-intl';

import { BaseQueryError, isBaseQueryError } from '../utils/baseQuery';

import { useAPIErrorHandler } from './useAPIErrorHandler';

import type { SerializedError } from '@reduxjs/toolkit';

/**
 * Shared error-to-string mapping for the MFA dialogs: a `BaseQueryError` (the server actually
 * responded, e.g. "Invalid credentials") is formatted through the app's API error formatter; any
 * other failure (a thrown exception RTK Query serialized as a `SerializedError`) falls back to a
 * generic message, since it carries nothing safe to show verbatim.
 */
const useToMessage = () => {
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  return (err: BaseQueryError | SerializedError) =>
    isBaseQueryError(err)
      ? formatAPIError(err)
      : formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' });
};

export { useToMessage };
