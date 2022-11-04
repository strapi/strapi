import { useQuery } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';

import pluginId from '../pluginId';
import { axiosInstance, getRequestUrl, getTrad } from '../utils';

export const useFolder = (id, { enabled = true }) => {
  const toggleNotification = useNotification();
  const dataRequestURL = getRequestUrl('folders');

  const fetchFolder = async () => {
    try {
      const { data } = await axiosInstance.get(
        `${dataRequestURL}/${id}?populate[parent][populate][parent]=*`
      );
      console.warn(
        'Deprecation warning: Usage of "axiosInstance" utility is deprecated. This is discouraged and will be removed in the next major release. Please use instead the useFetchClient hook inside the helper plugin and its function getClient'
      );

      return data.data;
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: {
          id: getTrad('notification.warning.404'),
          defaultMessage: 'Not found',
        },
      });

      throw err;
    }
  };

  const { data, error, isLoading } = useQuery([pluginId, 'folder', id], fetchFolder, {
    retry: false,
    enabled,
    staleTime: 0,
    cacheTime: 0,
  });

  return { data, error, isLoading };
};
