import * as React from 'react';

import { useNotification } from '../features/Notifications';
import { useAPIErrorHandler } from '../hooks/useAPIErrorHandler';
import { useGetContentTypesQuery } from '../services/contentManager';

import type { ContentType } from '../../../shared/contracts/content-types';

export function useContentTypes(): {
  isLoading: boolean;
  collectionTypes: ContentType[];
  singleTypes: ContentType[];
} {
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { toggleNotification } = useNotification();

  const { data, isLoading, error } = useGetContentTypesQuery();

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  return {
    isLoading,
    collectionTypes: data?.collectionType ?? [],
    singleTypes: data?.singleType ?? [],
  };
}
