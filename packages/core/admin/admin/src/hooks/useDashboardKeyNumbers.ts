import * as React from 'react';

import { useNotification } from '../features/Notifications';
import { useAPIErrorHandler } from '../hooks/useAPIErrorHandler';
import { useGetDashboardKeyNumbersQuery } from '../services/admin';

import type { KeyNumbers } from '../../../server/src/services/statistics';

export function useDashboardKeyNumbers(): {
  keyNumbers: KeyNumbers | undefined;
  isLoadingKeyNumbers: boolean;
} {
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { toggleNotification } = useNotification();

  const { data, isLoading, error } = useGetDashboardKeyNumbersQuery();

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  return {
    isLoadingKeyNumbers: isLoading,
    keyNumbers: data,
  };
}
