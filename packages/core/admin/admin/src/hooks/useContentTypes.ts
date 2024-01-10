import * as React from 'react';

import { useAPIErrorHandler, useNotification } from '@strapi/helper-plugin';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

import { useGetComponentsQuery, useGetContentTypesQuery } from '../services/contentManager';

export function useContentTypes(): {
  isLoading: boolean;
  components: Contracts.Components.Component[];
  collectionTypes: Contracts.ContentTypes.ContentType[];
  singleTypes: Contracts.ContentTypes.ContentType[];
} {
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();

  const components = useGetComponentsQuery();
  const contentTypes = useGetContentTypesQuery();

  React.useEffect(() => {
    if (contentTypes.error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(contentTypes.error),
      });
    }
  }, [contentTypes.error, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    if (components.error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(components.error),
      });
    }
  }, [components.error, formatAPIError, toggleNotification]);

  const isLoading = components.isLoading || contentTypes.isLoading;

  // the return value needs to be memoized, because intantiating
  // an empty array as default value would lead to an unstable return
  // value, which later on triggers infinite loops if used in the
  // dependency arrays of other hooks
  const collectionTypes = React.useMemo(() => {
    return (contentTypes?.data ?? []).filter(
      (contentType) => contentType.kind === 'collectionType' && contentType.isDisplayed
    );
  }, [contentTypes?.data]);

  const singleTypes = React.useMemo(() => {
    return (contentTypes?.data ?? []).filter(
      (contentType) => contentType.kind !== 'collectionType' && contentType.isDisplayed
    );
  }, [contentTypes?.data]);

  return {
    isLoading,
    components: React.useMemo(() => components?.data ?? [], [components?.data]),
    collectionTypes,
    singleTypes,
  };
}
