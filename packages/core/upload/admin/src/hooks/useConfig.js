import { useFetchClient, useNotification, useTracking } from '@strapi/helper-plugin';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import pluginId from '../pluginId';

const endpoint = `/${pluginId}/configuration`;
const queryKey = [pluginId, 'configuration'];

export const useConfig = () => {
  const queryClient = useQueryClient();
  const { trackUsage } = useTracking();
  const toggleNotification = useNotification();
  const { get, put } = useFetchClient();

  const config = useQuery(
    queryKey,
    async () => {
      const res = await get(endpoint);

      return res.data.data;
    },
    {
      onError() {
        return toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      },
      /**
       * We're cementing that we always expect an object to be returned.
       */
      select: (data) => (!data ? {} : data),
    }
  );

  const putMutation = useMutation(async (body) => put(endpoint, body), {
    onSuccess() {
      trackUsage('didEditMediaLibraryConfig');
      queryClient.refetchQueries(queryKey, { active: true });
    },
    onError() {
      return toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    },
  });

  return {
    config,
    mutateConfig: putMutation,
  };
};
