import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNotification, useTracking } from '@strapi/helper-plugin';

import { axiosInstance } from '../utils';
import pluginId from '../pluginId';

const endpoint = `/${pluginId}/config`;

export const useConfig = () => {
  const queryClient = useQueryClient();
  const { trackUsage } = useTracking();
  const toggleNotification = useNotification();

  const { isLoading, isError, data, error } = useQuery(
    ['ML_CONFIG'],
    async () =>
      axiosInstance({
        method: 'get',
        url: endpoint,
      }).then((res) => res.data),
    {
      staleTime: 0,
      cacheTime: 0,
    }
  );

  const putMutation = useMutation(
    (body) => {
      axiosInstance.put(endpoint, body);
    },
    {
      onSuccess() {
        trackUsage('didEditMediaLibraryConfig');
        queryClient.refetchQueries(['ML_CONFIG'], { active: true });
      },
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      },
    }
  );
  const { isLoading: putIsLoading } = putMutation;

  return {
    get: { isLoading, isError, data, error },
    put: {
      request: (body) => putMutation.mutateAsync(body),
      isLoading: putIsLoading,
      error: putMutation.error,
      status: putMutation.status,
    },
  };
};
