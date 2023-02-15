import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  useNotification,
  useTracking,
  useFetchClient,
  useAPIErrorHandler,
} from '@strapi/helper-plugin';

import pluginId from '../pluginId';

const endpoint = `/${pluginId}/configuration`;
const queryKey = [pluginId, 'configuration'];

export const useConfig = () => {
  const queryClient = useQueryClient();
  const { trackUsage } = useTracking();
  const toggleNotification = useNotification();
  const { get, put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();

  const config = useQuery(
    queryKey,
    async () => {
      const res = await get(endpoint);

      return res.data.data;
    },
    {
      onError(error) {
        return toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  const putMutation = useMutation(async (body) => put(endpoint, body), {
    onSuccess() {
      trackUsage('didEditMediaLibraryConfig');
      queryClient.refetchQueries(queryKey, { active: true });
    },
    onError(error) {
      return toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    },
  });

  return {
    config,
    mutateConfig: putMutation,
  };
};
