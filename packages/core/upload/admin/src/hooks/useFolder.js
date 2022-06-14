import { useQuery } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';

import pluginId from '../pluginId';
import { axiosInstance, getRequestUrl } from '../utils';

export const useFolder = (id, { enabled = true }) => {
  const toggleNotification = useNotification();
  const dataRequestURL = getRequestUrl('folders');

  const fetchFolder = async () => {
    try {
      const { data } = await axiosInstance.get(`${dataRequestURL}/${id}?populate=parent`);

      return data.data;
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
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
