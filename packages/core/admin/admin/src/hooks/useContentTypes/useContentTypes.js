import * as React from 'react';

import { useAPIErrorHandler, useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useQueries } from 'react-query';

export function useContentTypes() {
  const { get } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const queries = useQueries(
    ['components', 'content-types'].map((type) => {
      return {
        queryKey: ['content-manager', type],
        async queryFn() {
          const {
            data: { data },
          } = await get(`/content-manager/${type}`);

          return data;
        },
        onError(error) {
          toggleNotification({
            type: 'warning',
            message: formatAPIError(error),
          });
        },
      };
    })
  );

  const [components, contentTypes] = queries;
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
