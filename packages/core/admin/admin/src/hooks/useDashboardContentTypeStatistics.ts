import * as React from 'react';

import { UID } from '@strapi/types';

import { useNotification } from '../features/Notifications';
import { useAPIErrorHandler } from '../hooks/useAPIErrorHandler';
import { useGetDashboardStatisticsQuery } from '../services/admin';

import type { ContentTypeStatistics } from '../../../server/src/services/statistics';

export function useDashboardContentTypeStastistics(uid: UID.ContentType | null): {
  statistics: ContentTypeStatistics | undefined;
  isLoadingContentTypeStatistics: boolean;
} {
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { toggleNotification } = useNotification();

  const { data, isLoading, error } = useGetDashboardStatisticsQuery(uid, {
    refetchOnMountOrArgChange: true,
    skip: !uid,
  });

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  return {
    statistics: data,
    isLoadingContentTypeStatistics: isLoading,
  };
}
