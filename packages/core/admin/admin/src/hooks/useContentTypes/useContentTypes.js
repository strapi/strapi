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

  const collectionTypes = (contentTypes?.data ?? []).filter(
    (contentType) => contentType.kind === 'collectionType' && contentType.isDisplayed
  );
  const singleTypes = (contentTypes?.data ?? []).filter(
    (contentType) => contentType.kind !== 'collectionType' && contentType.isDisplayed
  );

  return {
    isLoading,
    components: components?.data ?? [],
    collectionTypes,
    singleTypes,
  };
}
