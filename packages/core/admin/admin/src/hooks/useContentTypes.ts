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

  const { data = [], isLoading, error } = useGetContentTypesQuery();

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  // the return value needs to be memoized, because intantiating
  // an empty array as default value would lead to an unstable return
  // value, which later on triggers infinite loops if used in the
  // dependency arrays of other hooks
  const collectionTypes = React.useMemo(() => {
    return data.filter(
      (contentType) => contentType.kind === 'collectionType' && contentType.isDisplayed
    );
  }, [data]);

  const singleTypes = React.useMemo(() => {
    return data.filter(
      (contentType) => contentType.kind !== 'collectionType' && contentType.isDisplayed
    );
  }, [data]);

  return {
    isLoading,
    collectionTypes,
    singleTypes,
  };
}
