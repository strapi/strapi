import { useQuery } from 'react-query';
import { useNotification, useFetchClient } from '@strapi/helper-plugin';

import pluginId from '../pluginId';
import { getRequestUrl, getTrad } from '../utils';

export const useFolder = (id, { enabled = true }) => {
  const toggleNotification = useNotification();
  const dataRequestURL = getRequestUrl('folders');
  const { get } = useFetchClient();

  const fetchFolder = async () => {
    try {
      const { data } = await get(`${dataRequestURL}/${id}?populate[parent][populate][parent]=*`);

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
