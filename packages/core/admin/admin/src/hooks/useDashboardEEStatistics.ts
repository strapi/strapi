import * as React from 'react';

import { useNotification } from '../features/Notifications';
import { useAPIErrorHandler } from '../hooks/useAPIErrorHandler';
import { useGetDashboardEEStatisticsQuery } from '../services/admin';

// import type { KeyNumbers } from '../../../shared/contracts/admin';

export function useDashboardEEStatistics(): {
  statistics: object;
  isLoadingEEStatistics: boolean;
} {
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { toggleNotification } = useNotification();

  const { data, isLoading, error } = useGetDashboardEEStatisticsQuery();

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  return {
    isLoadingEEStatistics: isLoading,
    statistics: data,
  };
}
